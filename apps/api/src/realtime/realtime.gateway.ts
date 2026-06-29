import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeServer } from './realtime.server';
import { RoutingService } from '../routing/routing.service';

/**
 * WebSocket gateway for paired Chrome extensions. A client authenticates with a
 * rep's pairing token in the connection handshake; once verified it joins the
 * rep's room, receives `incoming-lead`/`lead-resolved`/`open-crm`, and can emit
 * `accept`/`decline` back into the routing engine.
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer() private server!: Server;

  constructor(
    private readonly realtime: RealtimeServer,
    private readonly prisma: PrismaService,
    private readonly routing: RoutingService,
  ) {}

  afterInit(server: Server): void {
    this.realtime.setServer(server);
    this.logger.log('Realtime gateway initialized');
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = (client.handshake.auth?.token ?? client.handshake.query?.token) as
      | string
      | undefined;
    if (!token) {
      client.disconnect();
      return;
    }

    const rep = await this.prisma.rep.findUnique({
      where: { pairingToken: token },
      select: { id: true, active: true },
    });
    if (!rep) {
      this.logger.warn('Rejected extension connection with invalid pairing token');
      client.disconnect();
      return;
    }

    client.data.repId = rep.id;
    void client.join(`rep:${rep.id}`);
    this.realtime.markOnline(rep.id, client.id);
    client.emit('connected', { repId: rep.id });
    this.logger.log(`Extension connected for rep ${rep.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.realtime.markOffline(client.id);
  }

  @SubscribeMessage('accept')
  async onAccept(client: Socket, body: { attemptId?: string }): Promise<void> {
    if (body?.attemptId) await this.routing.accept(body.attemptId, 'extension');
  }

  @SubscribeMessage('decline')
  async onDecline(client: Socket, body: { attemptId?: string }): Promise<void> {
    if (body?.attemptId) await this.routing.decline(body.attemptId, 'extension');
  }
}
