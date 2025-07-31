import { Body, Controller, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { CreateIntentDto } from './dto';
import { IntentService } from './intent.service';

@Controller('intents')
export class IntentController {
  constructor(private readonly svc: IntentService) {}

  @Post() create(@Body() dto: CreateIntentDto) { return this.svc.create(dto); }

  @Get(':id') get(@Param('id') id: string) {
    const i = this.svc.get(id); if (!i) throw new NotFoundException('Intent not found'); return i;
  }

  @Patch(':id/status') patch(@Param('id') id: string, @Body() body: { status: any; tx?: Record<string,string> }) {
    const i = this.svc.patchStatus(id, body.status, body.tx);
    if (!i) throw new NotFoundException('Intent not found'); return i;
  }
}