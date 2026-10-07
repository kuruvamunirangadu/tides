import { BeachGIS } from '../models/BeachGIS';
import { ALL_BEACHES_GIS, RK_BEACH_GIS } from './BeachRepository';

export class BeachManager {
  private beaches: Map<string, BeachGIS> = new Map();
  private selectedBeachId: string = RK_BEACH_GIS.id;

  constructor(initialBeaches: BeachGIS[] = ALL_BEACHES_GIS) {
    initialBeaches.forEach((b) => {
      this.beaches.set(b.id, b);
    });
  }

  public getAllBeaches(): BeachGIS[] {
    return Array.from(this.beaches.values());
  }

  public getSelectedBeach(): BeachGIS {
    return this.beaches.get(this.selectedBeachId) || RK_BEACH_GIS;
  }

  public selectBeach(beachId: string): BeachGIS | undefined {
    const beach = this.beaches.get(beachId);
    if (beach) {
      this.selectedBeachId = beachId;
    }
    return beach;
  }

  public addBeach(beach: BeachGIS): void {
    this.beaches.set(beach.id, beach);
  }
}
