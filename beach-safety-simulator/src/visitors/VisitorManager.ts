import { Visitor } from '../models/Visitor';

export class VisitorManager {
  private visitors: Map<string, Visitor> = new Map();

  public addVisitor(visitor: Visitor): void {
    this.visitors.set(visitor.id, visitor);
  }

  public addVisitors(visitors: Visitor[]): void {
    visitors.forEach((v) => this.visitors.set(v.id, v));
  }

  public removeVisitor(id: string): void {
    this.visitors.delete(id);
  }

  public getVisitor(id: string): Visitor | undefined {
    return this.visitors.get(id);
  }

  public getAllVisitors(): Visitor[] {
    return Array.from(this.visitors.values());
  }

  public getActiveVisitors(): Visitor[] {
    return Array.from(this.visitors.values()).filter((v) => v.active);
  }

  public getVisitorsMap(): Map<string, Visitor> {
    return this.visitors;
  }

  public setVisitors(visitors: Visitor[]): void {
    this.visitors.clear();
    visitors.forEach((v) => this.visitors.set(v.id, v));
  }

  public clear(): void {
    this.visitors.clear();
  }
}
