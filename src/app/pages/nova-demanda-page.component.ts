import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Plus, MessageSquare, CheckCircle2, Trash2, PanelLeft, Sparkles } from 'lucide-angular';
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
    <div class="-m-6 flex bg-slate-950" style="height: calc(100vh - 56px)">

      <!-- Dark sidebar -->
      <div [class]="'flex flex-col shrink-0 bg-slate-950 transition-all duration-200 overflow-hidden ' + (sidebarOpen() ? 'w-64' : 'w-0')">
        <!-- Brand header -->
        <div class="px-4 pt-5 pb-3 flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
            <lucide-angular [img]="Sparkles" size="14" class="text-white" />
          </div>
          <span class="text-sm font-semibold text-white">Triagem IA</span>
        </div>

        <!-- New session button -->
        <div class="px-3 pb-3">
          <button type="button" (click)="newSession()"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
            <lucide-angular [img]="Plus" size="15" />
            Nova triagem
          </button>
        </div>

        <!-- Sessions list -->
        <div class="flex-1 overflow-y-auto px-2 pb-4">
          @for (group of sessionGroups(); track group.label) {
            <div class="mb-4">
              <p class="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-2 mb-1">{{ group.label }}</p>
              @for (session of group.sessions; track session.id) {
                <div [class]="'group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer mb-0.5 transition-colors ' + sessionItemClass(session.id)"
                  (click)="selectSession(session.id)">
                  <lucide-angular [img]="session.status === 'criada' ? CheckCircle2 : MessageSquare"
                    size="14" class="shrink-0 opacity-60" />
                  <span class="flex-1 text-xs truncate">{{ session.titulo }}</span>
                  <button type="button" (click)="deleteSession($event, session.id)"
                    class="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 transition-all">
                    <lucide-angular [img]="Trash2" size="13" />
                  </button>
                </div>
              }
            </div>
          }
          @if (!sessionService.sessions().length) {
            <p class="text-xs text-white/30 text-center px-4 py-6">Nenhuma triagem iniciada.</p>
          }
        </div>
      </div>

      <!-- Main area -->
      <div class="flex-1 min-w-0 flex flex-col bg-white overflow-hidden">
        <!-- Topbar -->
        <div class="flex items-center gap-3 px-4 h-14 border-b bg-white shrink-0">
          <button type="button" (click)="sidebarOpen.set(!sidebarOpen())"
            class="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            <lucide-angular [img]="PanelLeft" size="18" />
          </button>
          @if (activeSession(); as session) {
            <div class="flex-1 min-w-0 flex items-center gap-2">
              <span class="text-sm font-medium text-slate-800 truncate">{{ session.titulo }}</span>
              @if (session.status === 'criada') {
                <span class="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <lucide-angular [img]="CheckCircle2" size="11" />
                  Criada
                </span>
              } @else {
                <span class="shrink-0 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Em andamento
                </span>
              }
            </div>
          } @else {
            <span class="flex-1 text-sm text-slate-400">Nova triagem</span>
          }
        </div>

        <!-- Chat -->
        <div class="flex-1 min-h-0">
          <triagem-chat #chat [sessionId]="activeId()" (created)="onCreated()" />
        </div>
      </div>
    </div>
  `,
})
export class NovaDemandaPageComponent {
  @ViewChild('chat') chatRef?: TriagemChatComponent;

  router = inject(Router);
  sessionService = inject(TriagemSessionService);

  readonly Plus = Plus; readonly MessageSquare = MessageSquare;
  readonly CheckCircle2 = CheckCircle2; readonly Trash2 = Trash2;
  readonly PanelLeft = PanelLeft; readonly Sparkles = Sparkles;

  sidebarOpen = signal(true);
  activeId = signal<string | null>(null);

  activeSession = computed(() =>
    this.sessionService.sessions().find(s => s.id === this.activeId()) ?? null
  );

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

  sessionItemClass(id: string) {
    return this.activeId() === id
      ? 'bg-white/15 text-white'
      : 'hover:bg-white/10 text-white/70';
  }

  newSession() {
    const s = this.sessionService.createNew();
    this.activeId.set(s.id);
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
