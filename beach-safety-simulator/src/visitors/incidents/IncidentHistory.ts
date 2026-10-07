import { Incident } from '../../models/Incident';

export class IncidentHistory {
  private history: Incident[] = [];

  public logIncident(incident: Incident): void {
    this.history.unshift({ ...incident });
    if (this.history.length > 50) {
      this.history.pop();
    }
  }

  public getHistory(): Incident[] {
    return [...this.history];
  }

  public clear(): void {
    this.history = [];
  }
}
