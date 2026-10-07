import { ResponseAction } from '../models/ResponseAction';

export class ActionManager {
  private activeActions: Map<string, ResponseAction> = new Map();

  public addActions(actions: ResponseAction[]): void {
    actions.forEach((a) => {
      this.activeActions.set(a.id, a);
    });
  }

  public getActiveActions(): ResponseAction[] {
    return Array.from(this.activeActions.values()).filter((a) => a.status === 'ACTIVE');
  }

  public getAllActions(): ResponseAction[] {
    return Array.from(this.activeActions.values());
  }

  public cleanupCompletedActions(maxAgeSeconds: number = 30, currentTime: number = 0): void {
    this.activeActions.forEach((action, id) => {
      if (action.status === 'COMPLETED' && action.completedAt) {
        if (currentTime - action.completedAt > maxAgeSeconds) {
          this.activeActions.delete(id);
        }
      }
    });
  }

  public clear(): void {
    this.activeActions.clear();
  }
}
