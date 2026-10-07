import { Group, GroupType } from '../../models/Group';

export class GroupManager {
  private groups: Map<string, Group> = new Map();

  public createGroup(
    name: string,
    type: GroupType,
    leaderId: string,
    targetZoneId: string,
    cohesionRadius: number = 40
  ): Group {
    const group: Group = {
      id: `GRP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      name,
      type,
      leaderId,
      memberIds: [leaderId],
      targetZoneId,
      cohesionRadius,
    };
    this.groups.set(group.id, group);
    return group;
  }

  public addMember(groupId: string, memberId: string): void {
    const group = this.groups.get(groupId);
    if (group && !group.memberIds.includes(memberId)) {
      group.memberIds.push(memberId);
    }
  }

  public getGroup(groupId: string): Group | undefined {
    return this.groups.get(groupId);
  }

  public getAllGroups(): Group[] {
    return Array.from(this.groups.values());
  }

  public clear(): void {
    this.groups.clear();
  }
}
