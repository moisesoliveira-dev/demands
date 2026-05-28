import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  LucideAngularModule,
  Search,
  Send,
  Paperclip,
  Image as ImageIcon,
  Video as VideoIcon,
  Users,
  MessageCircle,
  ArrowLeft,
  X,
  Trash2,
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from 'lucide-angular';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  ChatsService,
  ConversaListItem,
  MensagemChat,
  UsuarioDisponivel,
} from '../services/chats.service';
import { AuthService } from '../services/auth.service';

/* ─── Diretiva: carrega imagem/vídeo via HttpClient (passa JWT) ─────────── */
@Component({
  selector: 'chat-media',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loading()) {
      <div class="flex items-center justify-center bg-muted/40 rounded-md p-4">
        <span class="text-xs text-muted-foreground">Carregando…</span>
      </div>
    }
    @if (objectUrl(); as u) {
      @if (kind === 'imagem') {
        <img [src]="u" [alt]="alt"
             class="max-h-72 max-w-full rounded-md cursor-zoom-in"
             (click)="abrirOriginal()" />
      } @else {
        <video [src]="u" controls class="max-h-72 max-w-full rounded-md"></video>
      }
    }
  `,
})
export class ChatMediaComponent implements OnInit {
  private http = inject(HttpClient);
  readonly loading = signal(true);
  readonly objectUrl = signal<string | null>(null);

  @Input() url = '';
  @Input() kind: 'imagem' | 'video' = 'imagem';
  @Input() alt = '';

  static cache = new Map<string, string>();

  async ngOnInit() {
    if (!this.url) { this.loading.set(false); return; }
    if (ChatMediaComponent.cache.has(this.url)) {
      this.objectUrl.set(ChatMediaComponent.cache.get(this.url)!);
      this.loading.set(false);
      return;
    }
    try {
      const blob = await firstValueFrom(
        this.http.get(this.url, { responseType: 'blob' }),
      );
      const u = URL.createObjectURL(blob);
      ChatMediaComponent.cache.set(this.url, u);
      this.objectUrl.set(u);
    } catch {
      /* silencioso */
    } finally {
      this.loading.set(false);
    }
  }

  abrirOriginal() {
    const u = this.objectUrl();
    if (u) window.open(u, '_blank');
  }
}

/* ─── Página principal ─────────────────────────────────────────────────── */

@Component({
  selector: 'app-conversas-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, LucideAngularModule, ChatMediaComponent],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-[340px_1fr] border border-border rounded-lg overflow-hidden bg-card"
         style="height: calc(100vh - 180px); min-height: 500px;">

      <!-- ═══════════ SIDEBAR ═══════════ -->
      <aside [class]="'flex flex-col border-r border-border bg-muted/30 ' + (conversaAtivaId() ? 'hidden md:flex' : 'flex')">
        <div class="px-4 py-3 border-b border-border bg-card flex items-center justify-between gap-2">
          <div>
            <h2 class="font-semibold text-foreground flex items-center gap-2">
              <lucide-angular [img]="MessageCircle" size="18" class="text-emerald-600" />
              Conversas
            </h2>
            <p class="text-xs text-muted-foreground mt-0.5">
              {{ conversas().length }} {{ conversas().length === 1 ? 'conversa' : 'conversas' }}
              @if (totalNaoLidas()) { · <span class="text-emerald-600 font-medium">{{ totalNaoLidas() }} não lidas</span> }
            </p>
          </div>
        </div>

        <div class="px-3 py-2 border-b border-border bg-card">
          <div class="relative">
            <lucide-angular [img]="Search" size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" [(ngModel)]="busca" placeholder="Pesquisar…"
              class="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          @if (conversasFiltradas().length === 0) {
            <div class="text-center py-10 px-4">
              <p class="text-sm text-muted-foreground">Nenhuma conversa.</p>
              <p class="text-xs text-muted-foreground mt-1">As conversas são criadas automaticamente ao abrir uma demanda.</p>
            </div>
          }
          @for (c of conversasFiltradas(); track c.id) {
            <button type="button" (click)="selecionar(c.id)"
              [class]="'w-full flex items-start gap-3 px-3 py-3 border-b border-border text-left transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 ' +
                       (conversaAtivaId() === c.id ? 'bg-emerald-50 dark:bg-emerald-950/30' : '')">
              <div [class]="'h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-semibold text-white text-sm ' + avatarColor(c.id)">
                @if (c.tipo === 'grupo') { <lucide-angular [img]="Users" size="18" /> }
                @else if (c.tipo === 'demanda') { <lucide-angular [img]="MessageCircle" size="18" /> }
                @else { {{ inicial(tituloConversa(c)) }} }
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline justify-between gap-2">
                  <p class="font-medium text-foreground text-sm truncate">{{ tituloConversa(c) }}</p>
                  <span class="text-[11px] text-muted-foreground shrink-0">
                    {{ c.ultimaMensagemEm | date:'HH:mm' }}
                  </span>
                </div>
                <div class="flex items-center justify-between gap-2 mt-0.5">
                  <p class="text-xs text-muted-foreground truncate">
                    @if (c.ultimaMensagem) {
                      @if (c.tipo === 'grupo') { <span class="font-medium">{{ c.ultimaMensagem.autorNome }}:</span> }
                      @switch (c.ultimaMensagem.tipo) {
                        @case ('imagem') { 📷 Imagem }
                        @case ('video') { 🎥 Vídeo }
                        @default { {{ c.ultimaMensagem.conteudo }} }
                      }
                    } @else { <em>Sem mensagens</em> }
                  </p>
                  @if (c.naoLidas > 0) {
                    <span class="bg-emerald-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {{ c.naoLidas }}
                    </span>
                  }
                </div>
                @if (c.tipo === 'grupo') {
                  <p class="text-[10px] text-muted-foreground mt-0.5">
                    <lucide-angular [img]="Users" size="10" class="inline" /> {{ c.participantes.length }} membros
                  </p>
                }
                @if (c.tipo === 'demanda') {
                  <p class="text-[10px] text-emerald-600 mt-0.5">Demanda</p>
                }
              </div>
            </button>
          }
        </div>

        <div class="px-3 py-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground flex items-start gap-1.5">
          <lucide-angular [img]="ShieldCheck" size="12" class="shrink-0 mt-0.5 text-emerald-600" />
          <span>Mensagens, imagens e vídeos são <b>registrados como prova legal</b> (hash + IP + horário).</span>
        </div>
      </aside>

      <!-- ═══════════ PAINEL DIREITO ═══════════ -->
      <section [class]="'flex flex-col bg-muted/10 dark:bg-muted/5 ' + (conversaAtivaId() ? 'flex' : 'hidden md:flex')">
        @if (conversaAtiva(); as c) {
          <header class="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card">
            <button type="button" class="md:hidden p-1 -ml-1 text-muted-foreground hover:text-foreground"
              (click)="voltarLista()" aria-label="Voltar">
              <lucide-angular [img]="ArrowLeft" size="20" />
            </button>
            <div [class]="'h-9 w-9 rounded-full flex items-center justify-center font-semibold text-white text-sm ' + avatarColor(c.id)">
              @if (c.tipo === 'grupo') { <lucide-angular [img]="Users" size="16" /> }
              @else { {{ inicial(tituloConversa(c)) }} }
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-foreground truncate">{{ tituloConversa(c) }}</p>
              <p class="text-xs text-muted-foreground truncate">
                @if (c.tipo === 'grupo') { {{ c.participantes.length }} membros: {{ nomesPreview(c) }} }
                @else if (c.tipo === 'demanda') { Conversa da demanda }
                @else { Conversa pessoal }
              </p>
            </div>
            @if (c.tipo === 'grupo') {
              <button type="button" (click)="abrirGerenciarGrupo(c)" title="Gerenciar grupo"
                class="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted">
                <lucide-angular [img]="Users" size="18" />
              </button>
            }
            @if (c.tipo === 'demanda' && c.demandaId) {
              <button type="button" (click)="abrirDemanda(c.demandaId!)" title="Abrir demanda"
                class="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted">
                <lucide-angular [img]="ExternalLink" size="18" />
              </button>
            }
          </header>

          <div #scroller class="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            @if (mensagens().length === 0) {
              <p class="text-center text-sm text-muted-foreground py-10">
                Nenhuma mensagem ainda. Diga olá! 👋
              </p>
            }
            @for (m of mensagens(); track m.id) {
              <div [class]="'flex ' + (m.autorId === currentUserId() ? 'justify-end' : 'justify-start')">
                <div [class]="'max-w-[78%] rounded-lg px-3 py-2 shadow-sm group relative ' +
                              (m.autorId === currentUserId() ? 'bg-emerald-100 dark:bg-emerald-900/40 text-foreground' : 'bg-card border border-border text-foreground')">
                  @if (m.autorId !== currentUserId() && c.tipo !== 'direto') {
                    <p class="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-0.5">
                      {{ m.autorNome }}
                    </p>
                  }
                  @if (m.apagada) {
                    <p class="text-sm italic text-muted-foreground">[mensagem apagada]</p>
                  } @else {
                    @for (a of m.anexos; track a.id) {
                      <div class="mb-1.5">
                        <chat-media
                          [url]="a.url"
                          [kind]="a.tipo"
                          [alt]="a.nomeOriginal">
                        </chat-media>
                        <p class="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <lucide-angular [img]="ShieldCheck" size="10" class="text-emerald-600" />
                          {{ a.nomeOriginal }} · {{ formatarBytes(a.bytes) }}
                        </p>
                      </div>
                    }
                    @if (m.conteudo) {
                      <p class="text-sm whitespace-pre-wrap break-words">{{ m.conteudo }}</p>
                    }
                    @if (m.analisada && m.analiseIA) {
                      <details class="mt-1.5 text-[11px] text-purple-700 dark:text-purple-300">
                        <summary class="cursor-pointer flex items-center gap-1">
                          <lucide-angular [img]="Sparkles" size="10" />
                          Análise IA (imagem)
                        </summary>
                        <p class="mt-1 pl-3 italic">{{ m.analiseIA }}</p>
                      </details>
                    }
                  }
                  <div class="flex items-center justify-end gap-1 mt-0.5">
                    <span class="text-[10px] text-muted-foreground">{{ m.criadoEm | date:'HH:mm' }}</span>
                    @if (m.autorId === currentUserId() && !m.apagada) {
                      <button type="button" (click)="apagar(m)"
                        class="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 transition"
                        title="Apagar (preserva no banco como prova)">
                        <lucide-angular [img]="Trash2" size="10" />
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>

          @if (anexosSelecionados().length > 0) {
            <div class="px-3 py-2 border-t border-border bg-muted/40 flex gap-2 flex-wrap">
              @for (f of anexosSelecionados(); track f.name; let i = $index) {
                <div class="relative bg-card border border-border rounded-md p-2 flex items-center gap-2 max-w-xs">
                  <lucide-angular [img]="f.type.startsWith('video') ? VideoIcon : ImageIcon" size="14"
                    class="text-emerald-600" />
                  <div class="min-w-0">
                    <p class="text-xs truncate">{{ f.name }}</p>
                    <p class="text-[10px] text-muted-foreground">{{ formatarBytes(f.size) }}</p>
                  </div>
                  <button type="button" (click)="removerAnexo(i)"
                    class="text-muted-foreground hover:text-red-600">
                    <lucide-angular [img]="X" size="12" />
                  </button>
                </div>
              }
            </div>
          }

          @if (chats.progressoUpload() !== null) {
            <div class="px-3 py-1 border-t border-border bg-muted/30">
              <div class="h-1 bg-muted rounded-full overflow-hidden">
                <div class="h-full bg-emerald-600 transition-all" [style.width.%]="chats.progressoUpload()"></div>
              </div>
              <p class="text-[10px] text-muted-foreground mt-0.5">Enviando… {{ chats.progressoUpload() }}%</p>
            </div>
          }

          <footer class="border-t border-border bg-card px-3 py-2 flex items-end gap-2">
            <input type="file" #fileInput hidden multiple
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              (change)="onArquivosSelecionados($event)" />
            <button type="button" (click)="fileInput.click()"
              class="p-2 text-muted-foreground hover:text-emerald-600 hover:bg-muted rounded-md"
              title="Anexar imagem ou vídeo (máx 10 MB / 100 MB)">
              <lucide-angular [img]="Paperclip" size="20" />
            </button>
            <textarea [(ngModel)]="textoMensagem" rows="1"
              (keydown.enter)="onEnter($event)"
              placeholder="Digite uma mensagem…"
              class="flex-1 resize-none px-3 py-2 text-sm rounded-md border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 max-h-32"></textarea>
            <button type="button" (click)="enviar()"
              [disabled]="!podeEnviar() || chats.enviando()"
              class="p-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
              <lucide-angular [img]="Send" size="20" />
            </button>
          </footer>
        } @else {
          <div class="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
            <div class="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
              <lucide-angular [img]="MessageCircle" size="40" class="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 class="text-lg font-medium text-foreground">Selecione uma conversa</h3>
            <p class="text-sm mt-1 max-w-xs">Escolha uma conversa ao lado para continuar.</p>
            <p class="text-[11px] mt-6 max-w-sm flex items-start gap-1.5">
              <lucide-angular [img]="ShieldCheck" size="12" class="shrink-0 mt-0.5 text-emerald-600" />
              <span>Mensagens, imagens e vídeos são <b>registrados imutavelmente como prova legal</b> (hash SHA-256, IP, horário, usuário). Mensagens apagadas continuam preservadas no banco.</span>
            </p>
          </div>
        }
      </section>
    </div>

    <!-- ═══════════ DIALOG: gerenciar grupo ═══════════ -->
    @if (dialogGrupoAberto() && grupoAtivo(); as g) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        (click)="dialogGrupoAberto.set(false)">
        <div class="bg-card border border-border rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col"
          (click)="$event.stopPropagation()">
          <header class="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 class="font-semibold text-foreground">{{ g.titulo }}</h3>
            <button type="button" (click)="dialogGrupoAberto.set(false)"
              class="text-muted-foreground hover:text-foreground">
              <lucide-angular [img]="X" size="18" />
            </button>
          </header>
          <div class="p-4 space-y-3 overflow-y-auto">
            <div>
              <p class="text-xs text-muted-foreground mb-2">Membros ({{ g.participantes.length }})</p>
              <ul class="space-y-1">
                @for (p of g.participantes; track p.usuarioId) {
                  <li class="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/40 rounded">
                    <div [class]="'h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-semibold ' + avatarColor(p.usuarioId)">
                      {{ inicial(p.usuarioNome) }}
                    </div>
                    <span class="flex-1 text-sm">{{ p.usuarioNome }}</span>
                    <span class="text-[10px] uppercase tracking-wide text-muted-foreground">{{ p.papel }}</span>
                    @if (souAdminDoGrupo(g) && p.usuarioId !== currentUserId()) {
                      <button type="button" (click)="removerDoGrupo(g.id, p.usuarioId)"
                        class="text-muted-foreground hover:text-red-600" title="Remover do grupo">
                        <lucide-angular [img]="X" size="14" />
                      </button>
                    }
                  </li>
                }
              </ul>
            </div>
            @if (souAdminDoGrupo(g)) {
              <div>
                <p class="text-xs text-muted-foreground mb-2">Adicionar pessoa</p>
                <select [(ngModel)]="novoMembroId"
                  class="w-full px-3 py-2 text-sm rounded-md border border-border bg-muted/30 text-foreground">
                  <option value="">— Escolher —</option>
                  @for (u of usuariosNaoNoGrupo(g); track u.id) {
                    <option [value]="u.id">{{ u.nome }} ({{ u.setor }})</option>
                  }
                </select>
                <button type="button" (click)="adicionarAoGrupo(g.id)"
                  [disabled]="!novoMembroId"
                  class="mt-2 w-full px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
                  Adicionar
                </button>
              </div>
            }
            <div class="pt-2 border-t border-border">
              <button type="button" (click)="sairDoGrupo(g.id)"
                class="text-sm text-red-600 hover:underline">
                Sair do grupo
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConversasPageComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  chats = inject(ChatsService);

  readonly Search = Search;
  readonly Send = Send;
  readonly Paperclip = Paperclip;
  readonly ImageIcon = ImageIcon;
  readonly VideoIcon = VideoIcon;
  readonly Users = Users;
  readonly MessageCircle = MessageCircle;
  readonly ArrowLeft = ArrowLeft;
  readonly X = X;
  readonly Trash2 = Trash2;
  readonly ShieldCheck = ShieldCheck;
  readonly ExternalLink = ExternalLink;
  readonly Sparkles = Sparkles;

  busca = '';
  textoMensagem = '';
  readonly anexosSelecionados = signal<File[]>([]);

  readonly usuariosDisponiveis = signal<UsuarioDisponivel[]>([]);

  readonly dialogGrupoAberto = signal(false);
  readonly grupoAtivo = signal<ConversaListItem | null>(null);
  novoMembroId = '';

  @ViewChild('scroller') scroller?: ElementRef<HTMLDivElement>;

  readonly conversas = computed(() => this.chats.conversas());
  readonly mensagens = computed(() => this.chats.mensagens());
  readonly conversaAtiva = computed(() => this.chats.conversaAtiva());
  readonly conversaAtivaId = computed(() => this.chats.conversaAtivaId());
  readonly totalNaoLidas = computed(() => this.chats.totalNaoLidas());

  readonly conversasFiltradas = computed(() => {
    const q = this.busca.trim().toLowerCase();
    const list = this.chats.conversas();
    if (!q) return list;
    return list.filter((c) =>
      this.tituloConversa(c).toLowerCase().includes(q) ||
      c.participantes.some((p) => p.usuarioNome.toLowerCase().includes(q)),
    );
  });

  currentUserId = computed(() => this.auth.user()?.id ?? '');

  async ngOnInit() {
    await this.chats.carregar();
    this.chats.iniciarPolling(3000);

    // Se vier ?demandaId=xxx (do card ou da página de detalhe), abre a conversa daquela demanda
    const demandaId = this.route.snapshot.queryParamMap.get('demandaId');
    if (demandaId) {
      const conversa = this.chats.conversas().find((c) => c.demandaId === demandaId);
      if (conversa) {
        await this.selecionar(conversa.id);
      }
      // Limpa o queryParam da URL sem renavegar
      this.router.navigate([], { replaceUrl: true, queryParams: {} });
    }
  }

  ngOnDestroy() {
    this.chats.pararPolling();
  }

  async selecionar(conversaId: string) {
    await this.chats.selecionar(conversaId);
    setTimeout(() => this.scrollToBottom(), 50);
  }

  voltarLista() {
    (this.chats as any)._conversaAtivaId?.set(null);
  }

  tituloConversa(c: ConversaListItem): string {
    if (c.titulo) return c.titulo;
    if (c.tipo === 'direto') {
      const outro = c.participantes.find((p) => p.usuarioId !== this.currentUserId());
      return outro?.usuarioNome ?? 'Conversa';
    }
    return 'Conversa';
  }

  nomesPreview(c: ConversaListItem): string {
    return c.participantes
      .filter((p) => p.usuarioId !== this.currentUserId())
      .slice(0, 3)
      .map((p) => p.usuarioNome.split(' ')[0])
      .join(', ');
  }

  inicial(nome: string): string {
    return (nome || '?').trim()[0]?.toUpperCase() ?? '?';
  }

  avatarColor(seed: string): string {
    const colors = [
      'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500',
      'bg-orange-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
    ];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    return colors[Math.abs(hash) % colors.length];
  }

  formatarBytes(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  }

  podeEnviar(): boolean {
    return (
      (this.textoMensagem.trim().length > 0 || this.anexosSelecionados().length > 0) &&
      !!this.conversaAtivaId() &&
      !this.chats.enviando()
    );
  }

  onEnter(ev: Event) {
    const ke = ev as KeyboardEvent;
    if (!ke.shiftKey) {
      ke.preventDefault();
      this.enviar();
    }
  }

  onArquivosSelecionados(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const validos: File[] = [];
    for (const f of files) {
      const isImg = f.type.startsWith('image/');
      const isVid = f.type.startsWith('video/');
      if (!isImg && !isVid) { alert(`Tipo não permitido: ${f.name}`); continue; }
      if (isImg && f.size > 10 * 1024 * 1024) { alert(`Imagem ${f.name} excede 10 MB`); continue; }
      if (isVid && f.size > 100 * 1024 * 1024) { alert(`Vídeo ${f.name} excede 100 MB`); continue; }
      validos.push(f);
    }
    this.anexosSelecionados.update((arr) => [...arr, ...validos]);
    input.value = '';
  }

  removerAnexo(i: number) {
    this.anexosSelecionados.update((arr) => arr.filter((_, idx) => idx !== i));
  }

  async enviar() {
    const id = this.conversaAtivaId();
    if (!id || !this.podeEnviar()) return;
    const texto = this.textoMensagem.trim();
    const arquivos = this.anexosSelecionados();
    this.textoMensagem = '';
    this.anexosSelecionados.set([]);
    try {
      if (arquivos.length > 0) {
        await firstValueFrom(this.chats.enviarComArquivos(id, texto, arquivos));
      } else {
        await this.chats.enviarTexto(id, texto);
      }
      setTimeout(() => this.scrollToBottom(), 100);
    } catch (e: any) {
      alert('Erro ao enviar: ' + (e?.error?.message ?? e?.message ?? 'falha'));
      this.textoMensagem = texto;
      this.anexosSelecionados.set(arquivos);
    }
  }

  async apagar(m: MensagemChat) {
    if (!confirm('Apagar mensagem? Ela continuará registrada no banco como prova legal.')) return;
    await this.chats.apagarMensagem(m.id);
  }

  private scrollToBottom() {
    const el = this.scroller?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  async abrirGerenciarGrupo(c: ConversaListItem) {
    this.grupoAtivo.set(c);
    this.dialogGrupoAberto.set(true);
    this.novoMembroId = '';
    if (this.usuariosDisponiveis().length === 0) {
      try { this.usuariosDisponiveis.set(await this.chats.listarUsuarios()); }
      catch { /* ignore */ }
    }
  }

  souAdminDoGrupo(c: ConversaListItem): boolean {
    return c.papel === 'dono' || c.papel === 'admin';
  }

  usuariosNaoNoGrupo(c: ConversaListItem): UsuarioDisponivel[] {
    const ids = new Set(c.participantes.map((p) => p.usuarioId));
    return this.usuariosDisponiveis().filter((u) => !ids.has(u.id));
  }

  async adicionarAoGrupo(conversaId: string) {
    if (!this.novoMembroId) return;
    try {
      await this.chats.adicionarParticipante(conversaId, this.novoMembroId);
      const atualizada = this.chats.conversas().find((c) => c.id === conversaId);
      if (atualizada) this.grupoAtivo.set(atualizada);
      this.novoMembroId = '';
    } catch (e: any) {
      alert('Erro: ' + (e?.error?.message ?? e?.message));
    }
  }

  async removerDoGrupo(conversaId: string, usuarioId: string) {
    if (!confirm('Remover esta pessoa do grupo?')) return;
    try {
      await this.chats.removerParticipante(conversaId, usuarioId);
      const atualizada = this.chats.conversas().find((c) => c.id === conversaId);
      if (atualizada) this.grupoAtivo.set(atualizada);
    } catch (e: any) {
      alert('Erro: ' + (e?.error?.message ?? e?.message));
    }
  }

  async sairDoGrupo(conversaId: string) {
    if (!confirm('Sair deste grupo?')) return;
    try {
      await this.chats.removerParticipante(conversaId, this.currentUserId());
      this.dialogGrupoAberto.set(false);
      (this.chats as any)._conversaAtivaId?.set(null);
      await this.chats.carregar();
    } catch (e: any) {
      alert('Erro: ' + (e?.error?.message ?? e?.message));
    }
  }

  abrirDemanda(demandaId: string) {
    this.router.navigate(['/demandas', demandaId]);
  }
}
