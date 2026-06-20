using QFramework;
using NineGrid.Core;
using NineGrid.Core.Commands;
using NineGrid.Core.Content;
using NineGrid.Core.Utilities;
using NineGrid.Content;

namespace NineGrid.WebTest.Services;

/// <summary>
/// Thin bridge between Blazor UI and NineGrid.Core.
/// Wraps the Architecture singleton, dispatcher, and exposes state for data binding.
/// </summary>
public class GameSession
{
    private CoreCommandDispatcher? _dispatcher;
    private IArchitecture? _arch;

    public CoreViewSnapshot? State { get; private set; }
    public bool IsRunning { get; private set; }
    public List<string> Log { get; } = new();
    public string? LastError { get; private set; }

    /// <summary>Fired after state changes so Blazor re-renders.</summary>
    public event Action? OnStateChanged;

    public void NewGame(ulong seed = 42)
    {
        try
        {
            // Reset singleton if re-creating
            NineGridArchitecture.ResetForTests();

            _arch = NineGridArchitecture.Current;

            // Load content catalog (hardcoded, no Luban)
            var catalog = TableNineContentCatalog.CreateDefault();
            var config = _arch.GetUtility<IConfigUtility>();
            config.Set(ContentConfigKeys.DefaultCatalog, catalog);

            // Create initial game state
            var snapshot = InitialGameFactory.Create(_arch, new InitialGameOptions
            {
                Seed = seed,
                AvatarMaxHp = 30,
                AvatarAttack = 1,
                AvatarRecovery = 1,
            });

            _dispatcher = new CoreCommandDispatcher(_arch);
            IsRunning = true;

            // Start first node
            var options = NodeDeckOptions.CreateDefaultBattle();
            Send(new StartNodeCommand(options));

            Log.Add($"[System] Game started. Seed={seed}, AvatarUid={snapshot.AvatarUid}");
            NotifyChanged();
        }
        catch (Exception ex)
        {
            LastError = ex.ToString();
            Log.Add($"[ERROR] {ex.Message}");
            NotifyChanged();
        }
    }

    public void Send(ICommand<CoreCommandResult> command)
    {
        if (_dispatcher == null)
        {
            LastError = "Game not initialized";
            return;
        }

        try
        {
            var result = _dispatcher.Send(command);

            if (result.Batch != null)
            {
                ProcessBatch(result.Batch);
            }

            if (!result.Accepted)
            {
                Log.Add($"[Rejected] {result.CommandResult?.Reason ?? "unknown"}");
            }
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            Log.Add($"[ERROR] {ex.Message}");
        }
    }

    private void ProcessBatch(PresentationBatch batch)
    {
        foreach (var inst in batch.Instructions)
        {
            var evt = inst.Event;
            var shortDesc = inst.Kind switch
            {
                PresentationInstructionKind.ShowDamage => $"DMG target={evt.TargetUid} amount={evt.Amount}",
                PresentationInstructionKind.UpdateHp => $"HP card={evt.CardUid} delta={evt.Delta} hp={evt.RemainingHp}",
                PresentationInstructionKind.UpdateArmor => $"Armor card={evt.CardUid} delta={evt.Delta} armor={evt.RemainingArmor}",
                PresentationInstructionKind.UpdateGold => $"Gold delta={evt.Delta}",
                PresentationInstructionKind.KillCard => $"KILL card={evt.CardUid}",
                PresentationInstructionKind.RemoveCard => $"REMOVE card={evt.CardUid} from={evt.FromSlot}",
                PresentationInstructionKind.MoveCard => $"MOVE card={evt.CardUid} {evt.FromSlot}→{evt.ToSlot}",
                PresentationInstructionKind.RotateBoard => "ROTATE board",
                PresentationInstructionKind.DealCard => $"DEAL card={evt.CardUid} to={evt.ToSlot}",
                PresentationInstructionKind.ChangePhase => $"PHASE → {evt.Message}",
                PresentationInstructionKind.StartNode => $"NODE START",
                PresentationInstructionKind.CompleteNode => $"NODE COMPLETE",
                PresentationInstructionKind.OfferReward => $"REWARD options",
                PresentationInstructionKind.SelectReward => $"REWARD selected idx={evt.Amount}",
                PresentationInstructionKind.OfferRooms => $"ROOM options",
                PresentationInstructionKind.SelectRoom => $"ROOM selected",
                PresentationInstructionKind.ResolveRoom => $"ROOM resolved: {evt.Message}",
                PresentationInstructionKind.PickItem => $"PICKUP card={evt.CardUid} from={evt.FromSlot}",
                PresentationInstructionKind.UseItem => $"USE ITEM card={evt.CardUid}",
                PresentationInstructionKind.TriggerEffect => $"TRIGGER {evt.SourceDefId}",
                PresentationInstructionKind.ShowRejectedIntent => $"REJECTED: {evt.Message}",
                PresentationInstructionKind.FillSlots => $"FILL slots",
                PresentationInstructionKind.SpawnCard => $"SPAWN card={evt.CardUid} at={evt.ToSlot}",
                PresentationInstructionKind.GrantSkill => $"SKILL granted: {evt.SourceDefId}",
                PresentationInstructionKind.GrantRelic => $"RELIC granted: {evt.SourceDefId}",
                PresentationInstructionKind.AdvanceNode => $"ADVANCE node",
                PresentationInstructionKind.MarkBoard => $"MARK board slot={evt.ToSlot}",
                PresentationInstructionKind.ApplyModifier => $"MODIFIER from={evt.SourceDefId}",
                PresentationInstructionKind.DeactivateEffect => $"DEACTIVATE {evt.SourceDefId}",
                PresentationInstructionKind.ModifyBaseStat => $"BASE STAT {evt.Message}",
                _ => $"{inst.Kind}"
            };
            Log.Add($"[{evt.Sequence}] {shortDesc}");
        }

        // Update state from snapshot
        State = batch.Snapshot;

        // Auto-acknowledge to unlock input (no animation delay in test mode)
        if (batch.RequiresAcknowledgement)
        {
            var ackResult = _dispatcher!.Send(new PresentationFinishedCommand(batch.BatchId));
            if (ackResult.Batch != null)
            {
                // The ack itself may produce a new batch (e.g. phase change events)
                // but we don't recurse infinitely because PresentationFinishedCommand
                // should not produce locking batches
                State = ackResult.Batch.Snapshot;
            }
        }
    }

    private void NotifyChanged()
    {
        OnStateChanged?.Invoke();
    }

    // ── Convenience methods for UI ──

    public void Attack(int slotIndex)
    {
        Send(new AttackCommand(SlotId.Board(slotIndex)));
        NotifyChanged();
    }

    public void PickupItem(int slotIndex)
    {
        Send(new PickupItemCommand(SlotId.Board(slotIndex)));
        NotifyChanged();
    }

    public void ClickEmpty(int slotIndex)
    {
        Send(new ClickEmptyCommand(SlotId.Board(slotIndex)));
        NotifyChanged();
    }

    public void UseItem(int itemUid)
    {
        Send(new UseItemCommand(itemUid));
        NotifyChanged();
    }

    public void SelectReward(int index)
    {
        Send(new SelectRewardCommand(index));
        NotifyChanged();
    }

    public void SkipReward()
    {
        Send(new SkipHelpChoiceCommand());
        NotifyChanged();
    }

    public void SelectRoom(int index)
    {
        Send(new SelectRoomCommand(index));
        NotifyChanged();
    }

    public void EnterRoom()
    {
        Send(new EnterRoomCommand());
        NotifyChanged();
    }

    public void StartNextNode()
    {
        var options = NodeDeckOptions.CreateDefaultBattle();
        Send(new StartNodeCommand(options));
        NotifyChanged();
    }
}
