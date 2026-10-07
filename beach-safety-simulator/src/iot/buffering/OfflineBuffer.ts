import { SensorReading } from '../models/SensorReading';

export interface BufferedPayload {
  sequenceNumber: number;
  reading: SensorReading;
  bufferedAt: number;
}

export class OfflineBuffer {
  private buffer: BufferedPayload[] = [];
  private sequenceCounter: number = 0;
  private maxBufferSize: number = 1000;
  private isOnline: boolean = true;

  public setOnlineStatus(online: boolean): void {
    this.isOnline = online;
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public push(reading: SensorReading, currentTime: number): boolean {
    if (!this.isOnline) {
      this.sequenceCounter++;
      this.buffer.push({
        sequenceNumber: this.sequenceCounter,
        reading,
        bufferedAt: currentTime,
      });

      if (this.buffer.length > this.maxBufferSize) {
        this.buffer.shift(); // Evict oldest
      }
      return true; // Buffered
    }
    return false; // Transmitted directly
  }

  public drain(): BufferedPayload[] {
    const drained = [...this.buffer];
    this.buffer = [];
    return drained;
  }

  public getBufferedCount(): number {
    return this.buffer.length;
  }

  public clear(): void {
    this.buffer = [];
    this.sequenceCounter = 0;
  }
}
