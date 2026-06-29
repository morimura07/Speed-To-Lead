import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RepsModule } from '../reps/reps.module';
import { RemindersService } from './reminders.service';
import { ReminderDispatcher } from './reminder.dispatcher';
import { ReminderWorker } from './reminder.worker';
import { RemindersController } from './reminders.controller';
import { ReminderVoiceController } from './reminder-voice.controller';

/**
 * Follow-up reminder calls: schedule → delayed job → call the rep at the due
 * time (or move to their next free block). Imports RepsModule for availability.
 */
@Module({
  imports: [AuthModule, RepsModule],
  controllers: [RemindersController, ReminderVoiceController],
  providers: [RemindersService, ReminderDispatcher, ReminderWorker],
  exports: [RemindersService],
})
export class RemindersModule {}
