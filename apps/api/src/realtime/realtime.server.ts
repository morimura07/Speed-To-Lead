import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { IncomingLeadPayload, RealtimeNotifier } from './realtime.types';

/**
 * Holds the Socket.IO server + rep presence, and performs all outbound emits.
 * Separated from the gateway so the routing engine can depend on this (emit
 * only) without a circular dependency on the gateway (which needs RoutingService
 * for inbound accept/decline).
 */
@Injectable()
export class RealtimeServer implements RealtimeNotifier {
  private readonly logger = new Logger(RealtimeServer.name);
  private server: Server | null = null;

  /** repId → set of connected socket ids. */
  private readonly online = new Map<string, Set<string>>();
  /** socketId → repId, for cleanup on disconnect. */
  private readonly bySocket = new Map<string, string>();

  setServer(server: Server): void {
    this.server = server;
  }

  // ── Presence ────────────────────────────────────────────────────────────────

  markOnline(repId: string, socketId: string): void {
    let set = this.online.get(repId);
    if (!set) {
      set = new Set();
      this.online.set(repId, set);
    }
    set.add(socketId);
    this.bySocket.set(socketId, repId);
  }

  markOffline(socketId: string): void {
    const repId = this.bySocket.get(socketId);
    if (!repId) return;
    this.bySocket.delete(socketId);
    const set = this.online.get(repId);
    set?.delete(socketId);
    if (set && set.size === 0) this.online.delete(repId);
  }

  isOnline(repId: string): boolean {
    return (this.online.get(repId)?.size ?? 0) > 0;
  }

  private room(repId: string): string {
    return `rep:${repId}`;
  }

  // ── Outbound emits ────────────────────────────────────────────────────────

  ringRep(repId: string, payload: IncomingLeadPayload): void {
    this.server?.to(this.room(repId)).emit('incoming-lead', payload);
    this.logger.debug(`Rang extension for rep ${repId} (attempt ${payload.attemptId})`);
  }

  resolve(repId: string, attemptId: string): void {
    this.server?.to(this.room(repId)).emit('lead-resolved', { attemptId });
  }

  openCrm(repId: string, url: string): void {
    this.server?.to(this.room(repId)).emit('open-crm', { url });
  }
}
