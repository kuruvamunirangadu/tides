import { Dispatch, DispatchStatus } from '../models/Dispatch';

export class DispatchManager {
  private dispatches: Map<string, Dispatch> = new Map();

  public createDispatch(
    incidentId: string,
    resourceId: string,
    dispatchedAt: number,
    estimatedArrival: number,
    notes?: string
  ): Dispatch {
    const id = `DSP-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`;
    const dispatch: Dispatch = {
      id,
      incidentId,
      resourceId,
      dispatchedAt,
      estimatedArrival,
      status: 'DISPATCHED',
      notes,
    };
    this.dispatches.set(id, dispatch);
    return dispatch;
  }

  public updateStatus(id: string, status: DispatchStatus, actualArrival?: number): void {
    const d = this.dispatches.get(id);
    if (d) {
      d.status = status;
      if (actualArrival) d.actualArrival = actualArrival;
    }
  }

  public getByIncident(incidentId: string): Dispatch[] {
    return Array.from(this.dispatches.values()).filter((d) => d.incidentId === incidentId);
  }

  public getAll(): Dispatch[] {
    return Array.from(this.dispatches.values());
  }

  public clear(): void {
    this.dispatches.clear();
  }
}
