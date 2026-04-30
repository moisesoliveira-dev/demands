import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Plus, MessageSquare, CheckCircle2, Trash2, Bot, Menu, X } from 'lucide-angular';
import { isToday, isYesterday } from 'date-fns';
import { TriagemChatComponent } from '../components/demandas/triagem-chat.component';
import { TriagemSessionService, ChatSession } from '../services/triagem-session.service';

interface SessionGroup {
  label: string;
  sessions: ChatSession[];
}

@Component({
  selector: 'app-nova-demanda',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TriagemChatComponent],
  template: `
    <div class="flex h-[calc(100vh-7rem)] border border-slate-200 rounded-lg shadow-sm overflow-hidden bg-white">

      <!-- Sessions sidebar -->
      @if (sidebarOpen()) {
        <div class="w-60 flex flex-col border-r bg-slate-50 shrink-0 overflow-hidden">
          <!-- Header -->
          <div class="p-3 border-b space-y-2 shrink-0">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Triagens</span>
              <button type="button" (click)="sidebarOpen.set(false)"
                class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <lucide-angular [img]="X" size="14" />
              </button>
            </div>
            <button type="button" (click)="newSession()"
              class="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
              <lucide-angular [img]="Plus" size="15" />
              Nova triagem
            </button>
          </div>

          <!-- Sessions list -->
          <div class="flex-1 overflow-y-auto py-2">
            @for (group of sessionGroups(); track group.label) {
              <div class="px-2 mb-1">
                <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">{{ group.label }}</p>
                @for (session of group.sessions; track session.id) {
                  <div [class]="'group flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer mb-0.5 transition-colors ' + itemClass(session.id)"
                    (click)="selectSession(session.id)">
                    <lucide-angular [img]="session.status === 'criada' ? CheckCircle2 : MessageSquare"
                      size="14"
                      [class]="session.status === 'criada' ? 'mt-0.5 shrink-0 text-emerald-500' : 'mt-0.5 shrink-0 text-slate-400'" />
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-medium text-slate-800 truncate leading-tight">{{ session.titulo }}</p>
                      <p [class]="session.status === 'criada' ? 'text-[10px] text-emerald-600' : 'text-[10px] text-slate-400'">
                        {{ session.status === 'criada' ? 'Criada' : 'Em andamento' }}
                      </p>
                    </div>
                    <button type="button" (click)="deleteSession($event, session.id)"
                      class="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 hover:text-red-500 text-slate-400 transition-all">
                      <lucide-angular [img]="Trash2" size="13" />
                    </button>
                  </div>
                }
              </div>
            }
            @if (!sessionService.sessions().length) {
              <p class="text-xs text-slate-400 text-center px-4 py-8 leading-relaxed">Nenhuma triagem iniciada.</p>
            }
          </div>
        </div>
      }

      <!-- Collapsed sidebar toggle -->
      @if (!sidebarOpen()) {
        <div class="flex flex-col items-center py-3 px-1 border-r bg-slate-50 gap-2 shrink-0">
          <button type="button" (click)="sidebarOpen.set(true)"
            class="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Abrir triagens">
            <lucide-angular [img]="Menu" size="16" />
          </button>
          <button type="button" (click)="newSession()"
            class="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 transition-colors" title="Nova triagem">
            <lucide-angular [img]="Plus" size="16" />
          </button>
        </div>
      }

      <!-- Chat area -->
      <div class="flex-1 min-w-0 flex flex-col">
        @if (activeId()) {
          <triagem-chat [sessionId]="activeId()" (created)="onCreated()" />
        } @else {
          <div class="flex-1 flex items-center justify-center text-slate-400">
            <div class="text-center space-y-3">
              <lucide-angular [img]="Bot" size="40" class="mx-auto opacity-30" />
              <p class="text-sm">Selecione uma triagem ou crie uma nova</p>
              <button type="button" (click)="newSession()"
                class="text-sm text-emerald-600 hover:text-emerald-700 underline underline-offset-2">
                Iniciar nova triagem
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class NovaDemandaPageComponent {
  router = inject(Router);
  sessionService = inject(TriagemSessionService);

  readonly Plus = Plus; readonly MessageSquare = MessageSquare;
  readonly CheckCircle2 = CheckCircle2; readonly Trash2 = Trash2;
  readonly Bot = Bot; readonly Menu = Menu; readonly X = X;

  sidebarOpen = signal(true);
  activeId = signal<string | null>(null);

  sessionGroups = computed<SessionGroup[]>(() => {
    const sessions = this.sessionService.sessions();
    const today: ChatSession[] = [];
    const yesterday: ChatSession[] = [];
    const older: ChatSession[] = [];
    for (const s of sessions) {
      const d = new Date(s.atualizadaEm);
      if (isToday(d)) today.push(s);
      else if (isYesterday(d)) yesterday.push(s);
      else older.push(s);
    }
    const groups: SessionGroup[] = [];
    if (today.length) groups.push({ label: 'Hoje', sessions: today });
    if (yesterday.length) groups.push({ label: 'Ontem', sessions: yesterday });
    if (older.length) groups.push({ label: 'Anteriores', sessions: older });
    return groups;
  });

  constructor() {
    const sessions = this.sessionService.sessions();
    if (sessions.length > 0) {
      this.activeId.set(sessions[0].id);
    } else {
      const s = this.sessionService.createNew();
      this.activeId.set(s.id);
    }
  }

  itemClass(id: string) {
    return this.activeId() === id
      ? 'bg-slate-200 text-slate-900'
      : 'hover:bg-slate-100 text-slate-700';
  }

  newSession() {
    const s = this.sessionService.createNew();
    this.activeId.set(s.id);
    this.sidebarOpen.set(true);
  }

  selectSession(id: string) {
    this.activeId.set(id);
  }

  deleteSession(event: MouseEvent, id: string) {
    event.stopPropagation();
    this.sessionService.remove(id);
    if (this.activeId() === id) {
      const remaining = this.sessionService.sessions();
      if (remaining.length > 0) {
        this.activeId.set(remaining[0].id);
      } else {
        const s = this.sessionService.createNew();
        this.activeId.set(s.id);
      }
    }
  }

  onCreated() {
    setTimeout(() => this.router.navigate(['/demandas']), 2000);
  }
}
