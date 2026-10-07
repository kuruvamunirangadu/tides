export type DispatchStatus =
  | 'CREATED'
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'CANCELLED'
  | 'FAILED';

export interface Dispatch {
  id: string;
  incidentId: string;
  resourceId: string;
  dispatchedAt: number;
  estimatedArrival: number;
  actualArrival?: number;
  status: DispatchStatus;
  notes?: string;
}
