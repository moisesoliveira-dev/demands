import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Brain, BarChart3, BookOpen, Upload, Trash2, RefreshCw, AlertTriangle, CheckCircle2, UserCircle, Eraser } from 'lucide-angular';

import { UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiCardDescription } from '../components/ui/card.component';
import { UiButton } from '../components/ui/button.component';
import { UiLabel } from '../components/ui/form-elements.component';
import { AiAdminService, KnowledgeDocument, MemoryItem } from '../services/ai-admin.service';
import { toast } from '../lib/toast';

type TabId = 'ia-config' | 'ia-metricas' | 'ia-conhecimento' | 'ia-perfil';

@Component({
    selector: 'app-ia-admin',
    standalone: true,
    imports: [
        CommonModule, FormsModule, DecimalPipe, LucideAngularModule,
        UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiCardDescription,
        UiButton, UiLabel,
    ],
    template: `
    <div class="space-y-4 max-w-5xl">
      <div class="flex flex-wrap gap-1 border-b border-slate-200">
        @for (t of tabs; track t.id) {
          <button type="button" (click)="active.set(t.id)"
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px"
            [class.border-primary]="active() === t.id"
            [class.text-primary]="active() === t.id"
            [class.border-transparent]="active() !== t.id"
            [class.text-slate-600]="active() !== t.id"
            [class.hover:text-slate-900]="active() !== t.id">
            <lucide-angular [img]="t.icon" size="16" />
            {{ t.label }}
          </button>
        }
      </div>

      @if (active() === 'ia-config') {
        <ui-card>
          <ui-card-header>
            <ui-card-title class="flex items-center gap-2"><lucide-angular [img]="Brain" size="18" /> Configuração da IA</ui-card-title>
            <ui-card-description>Provedor, modelo e comportamento. Sobrescreve o que está no .env do servidor.</ui-card-description>
          </ui-card-header>
          <ui-card-content class="space-y-4">
            @if (cfg(); as c) {
              <div class="grid sm:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <ui-label for="model">Modelo padrão (provider:model_id)</ui-label>
                  <input id="model" type="text" [class]="inputCls" [(ngModel)]="form.default_model" placeholder="groq:llama-3.3-70b-versatile" />
                  <p class="text-xs text-slate-500">Ex.: <code>groq:llama-3.3-70b-versatile</code>, <code>openai:gpt-4o-mini</code>, <code>anthropic:claude-3-5-sonnet-20241022</code>, <code>google:gemini-2.0-flash</code></p>
                </div>
                <div class="space-y-2">
                  <ui-label for="temp">Temperature ({{ form.temperature }})</ui-label>
                  <input id="temp" type="range" min="0" max="2" step="0.1"
                    [value]="form.temperature"
                    (input)="form.temperature = +$any($event.target).value"
                    class="w-full" />
                  <p class="text-xs text-slate-500">0 = determinístico • 2 = muito criativo</p>
                </div>
                <div class="space-y-2">
                  <ui-label for="emb_p">Embedder provider</ui-label>
                  <input id="emb_p" type="text" [class]="inputCls" [(ngModel)]="form.embedder_provider" placeholder="google" />
                </div>
                <div class="space-y-2">
                  <ui-label for="emb_m">Embedder model</ui-label>
                  <input id="emb_m" type="text" [class]="inputCls" [(ngModel)]="form.embedder_model" placeholder="gemini-embedding-001" />
                </div>
                <div class="space-y-2">
                  <ui-label for="topk">Top-K (RAG)</ui-label>
                  <input id="topk" type="number" min="1" max="20" [class]="inputCls" [(ngModel)]="form.kb_top_k" />
                </div>
                <div class="space-y-2 sm:col-span-2">
                  <ui-label for="sysp">System prompt extra (mentalidade da empresa)</ui-label>
                  <textarea id="sysp" rows="6" [class]="textareaCls" [(ngModel)]="form.system_prompt_extra"
                    placeholder="Ex.: 'Você atua na Indústria X, fabricante de Y. Nossos clientes principais são... Nossos processos críticos são... Use o jargão da empresa: ...'"></textarea>
                  <p class="text-xs text-slate-500">Concatenado às instruções base de todos os agentes. Para conhecimento extenso (manuais, normas), use a aba <strong>Conhecimento</strong>.</p>
                </div>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-slate-200">
                <div class="flex items-center gap-2 text-xs">
                  @if (c.supabase_configured) {
                    <span class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800">
                      <lucide-angular [img]="CheckCircle2" size="12" /> Supabase OK
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800">
                      <lucide-angular [img]="AlertTriangle" size="12" /> Supabase não configurado
                    </span>
                  }
                </div>
                <div class="flex gap-2">
                  <ui-button variant="outline" (click)="reload()" [disabled]="saving()">
                    <lucide-angular [img]="RefreshCw" size="14" /> Recarregar
                  </ui-button>
                  <ui-button (click)="saveConfig()" [disabled]="saving()">
                    {{ saving() ? 'Salvando...' : 'Salvar' }}
                  </ui-button>
                </div>
              </div>
            } @else {
              <div class="space-y-4">
                @for (_ of [1,2]; track $index) {
                  <div class="grid sm:grid-cols-2 gap-4">
                    @for (__ of [1,2]; track $index) {
                      <div class="space-y-2">
                        <div class="h-3 bg-slate-200 animate-pulse rounded w-24"></div>
                        <div class="h-9 bg-slate-200 animate-pulse rounded"></div>
                      </div>
                    }
                  </div>
                }
                <div class="space-y-2">
                  <div class="h-3 bg-slate-200 animate-pulse rounded w-32"></div>
                  <div class="h-28 bg-slate-200 animate-pulse rounded"></div>
                </div>
              </div>
            }
          </ui-card-content>
        </ui-card>
      }

      @if (active() === 'ia-metricas') {
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <ui-label class="text-sm">Período:</ui-label>
              @for (d of [7, 30, 90]; track d) {
                <ui-button size="sm" [variant]="metricsDays() === d ? 'default' : 'outline'"
                  (click)="changeDays(d)">{{ d }}d</ui-button>
              }
            </div>
            <ui-button variant="outline" size="sm" (click)="loadMetrics()">
              <lucide-angular [img]="RefreshCw" size="14" /> Atualizar
            </ui-button>
          </div>

          @if (metrics(); as m) {
            <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div class="rounded-lg border border-slate-200 bg-white p-4">
                <p class="text-xs text-slate-500 uppercase">Runs</p>
                <p class="text-2xl font-bold mt-1">{{ m.totals.runs | number }}</p>
                <p class="text-xs text-slate-400 mt-1">Sucesso: {{ m.totals.success_rate }}%</p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-white p-4">
                <p class="text-xs text-slate-500 uppercase">Tokens totais</p>
                <p class="text-2xl font-bold mt-1">{{ m.totals.total_tokens | number }}</p>
                <p class="text-xs text-slate-400 mt-1">in {{ m.totals.input_tokens | number }} • out {{ m.totals.output_tokens | number }}</p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-white p-4">
                <p class="text-xs text-slate-500 uppercase">Custo estimado</p>
                <p class="text-2xl font-bold mt-1">$ {{ m.totals.cost_usd | number:'1.2-4' }}</p>
                <p class="text-xs text-slate-400 mt-1">USD</p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-white p-4">
                <p class="text-xs text-slate-500 uppercase">Latência média</p>
                <p class="text-2xl font-bold mt-1">{{ m.totals.avg_latency_ms | number }} ms</p>
              </div>
            </div>

            <div class="grid lg:grid-cols-2 gap-4">
              <ui-card>
                <ui-card-header><ui-card-title class="text-base">Por modelo</ui-card-title></ui-card-header>
                <ui-card-content>
                  @if (m.per_model.length) {
                    <table class="w-full text-sm">
                      <thead class="text-xs text-slate-500 border-b">
                        <tr><th class="text-left py-2">Modelo</th><th class="text-right">Runs</th><th class="text-right">Tokens</th><th class="text-right">Custo</th></tr>
                      </thead>
                      <tbody>
                        @for (r of m.per_model; track r.model_spec) {
                          <tr class="border-b border-slate-100">
                            <td class="py-2 font-mono text-xs">{{ r.model_spec }}</td>
                            <td class="text-right">{{ r.runs | number }}</td>
                            <td class="text-right">{{ r.tokens | number }}</td>
                            <td class="text-right">$ {{ r.cost | number:'1.2-4' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  } @else {
                    <p class="text-sm text-slate-500">Nenhum uso registrado neste período.</p>
                  }
                </ui-card-content>
              </ui-card>

              <ui-card>
                <ui-card-header><ui-card-title class="text-base">Top usuários</ui-card-title></ui-card-header>
                <ui-card-content>
                  @if (m.per_user.length) {
                    <table class="w-full text-sm">
                      <thead class="text-xs text-slate-500 border-b">
                        <tr><th class="text-left py-2">Usuário</th><th class="text-right">Runs</th><th class="text-right">Tokens</th><th class="text-right">Custo</th></tr>
                      </thead>
                      <tbody>
                        @for (r of m.per_user; track r.user_id) {
                          <tr class="border-b border-slate-100">
                            <td class="py-2 truncate max-w-[200px]">{{ r.user_id }}</td>
                            <td class="text-right">{{ r.runs | number }}</td>
                            <td class="text-right">{{ r.tokens | number }}</td>
                            <td class="text-right">$ {{ r.cost | number:'1.2-4' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  } @else {
                    <p class="text-sm text-slate-500">Sem dados de usuários.</p>
                  }
                </ui-card-content>
              </ui-card>
            </div>

            <ui-card>
              <ui-card-header><ui-card-title class="text-base">Uso por dia</ui-card-title></ui-card-header>
              <ui-card-content>
                @if (m.per_day.length) {
                  <div class="space-y-1">
                    @for (d of m.per_day; track d.day) {
                      <div class="flex items-center gap-2 text-xs">
                        <span class="w-24 text-slate-600 font-mono">{{ d.day }}</span>
                        <div class="flex-1 bg-slate-100 rounded h-4 relative overflow-hidden">
                          <div class="absolute inset-y-0 left-0 bg-primary/70"
                            [style.width.%]="barPct(d.tokens, maxDayTokens())"></div>
                        </div>
                        <span class="w-20 text-right">{{ d.tokens | number }} tk</span>
                        <span class="w-20 text-right text-slate-500">$ {{ d.cost | number:'1.2-4' }}</span>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-sm text-slate-500">Sem dados.</p>
                }
              </ui-card-content>
            </ui-card>
          } @else {
            <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              @for (_ of [1,2,3,4]; track $index) {
                <div class="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
                  <div class="h-3 bg-slate-200 animate-pulse rounded w-20"></div>
                  <div class="h-8 bg-slate-200 animate-pulse rounded w-16"></div>
                  <div class="h-3 bg-slate-200 animate-pulse rounded w-24"></div>
                </div>
              }
            </div>
          }
        </div>
      }

      @if (active() === 'ia-conhecimento') {
        <ui-card>
          <ui-card-header>
            <ui-card-title class="flex items-center gap-2"><lucide-angular [img]="BookOpen" size="18" /> Base de Conhecimento</ui-card-title>
            <ui-card-description>
              Documentos enviados aqui são vetorizados (Gemini embeddings) e armazenados no Supabase.
              O agente de triagem busca trechos relevantes em cada conversa para enriquecer as demandas.
            </ui-card-description>
          </ui-card-header>
          <ui-card-content class="space-y-4">
            @if (!knowledge().configured) {
              <div class="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs flex items-start gap-2">
                <lucide-angular [img]="AlertTriangle" size="14" class="text-amber-600 mt-0.5" />
                <div class="text-amber-900">
                  Supabase ou GOOGLE_API_KEY não configurados no servidor.
                  Defina <code>SUPABASE_URL</code>, <code>SUPABASE_SERVICE_KEY</code> e <code>GOOGLE_API_KEY</code> no <code>demands-ai/.env</code>
                  e rode <code>db/supabase_schema.sql</code> no SQL Editor do Supabase.
                </div>
              </div>
            }

            <div class="flex flex-wrap items-center gap-2">
              <input #fileInput type="file" class="hidden" accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
                (change)="onFileSelected($event)" />
              <input type="text" [class]="inputCls + ' max-w-[200px]'" [(ngModel)]="uploadSetor"
                placeholder="Setor (opcional)" [disabled]="uploading() || !knowledge().configured" />
              <ui-button (click)="fileInput.click()" [disabled]="uploading() || !knowledge().configured">
                <lucide-angular [img]="Upload" size="14" />
                {{ uploading() ? 'Enviando e indexando...' : 'Adicionar documento' }}
              </ui-button>
              <ui-button variant="outline" (click)="loadKnowledge()" [disabled]="uploading()">
                <lucide-angular [img]="RefreshCw" size="14" /> Atualizar
              </ui-button>
              <span class="text-xs text-slate-500">.txt, .md, .pdf — até 10 MB. Setor amarra o documento ao filtro RAG do usuário.</span>
            </div>

            @if (knowledge().documents.length) {
              <div class="rounded-md border border-slate-200 overflow-hidden">
                <table class="w-full text-sm">
                  <thead class="text-xs text-slate-500 bg-slate-50">
                    <tr>
                      <th class="text-left px-3 py-2">Arquivo</th>
                      <th class="text-left px-3 py-2">Setor</th>
                      <th class="text-left px-3 py-2">Tipo</th>
                      <th class="text-right px-3 py-2">Tamanho</th>
                      <th class="text-right px-3 py-2">Chunks</th>
                      <th class="text-left px-3 py-2">Enviado em</th>
                      <th class="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (d of knowledge().documents; track d.id) {
                      <tr class="border-t border-slate-100">
                        <td class="px-3 py-2 truncate max-w-[280px]">{{ d.filename }}</td>
                        <td class="px-3 py-2 text-xs">
                          @if (d.setor) {
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{{ d.setor }}</span>
                          } @else {
                            <span class="text-slate-400">—</span>
                          }
                        </td>
                        <td class="px-3 py-2 text-xs text-slate-500">{{ d.content_type || '-' }}</td>
                        <td class="px-3 py-2 text-right">{{ formatBytes(d.size_bytes) }}</td>
                        <td class="px-3 py-2 text-right">{{ chunksOf(d) }}</td>
                        <td class="px-3 py-2 text-xs">{{ d.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                        <td class="px-3 py-2 text-right">
                          <button (click)="confirmDelete(d)" class="text-red-600 hover:text-red-700"
                            [attr.aria-label]="'Remover ' + d.filename">
                            <lucide-angular [img]="Trash2" size="14" />
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else if (knowledge().configured) {
              <p class="text-sm text-slate-500">Nenhum documento ainda. Comece adicionando manuais, procedimentos ou tickets antigos.</p>
            }
          </ui-card-content>
        </ui-card>
      }

      @if (active() === 'ia-perfil') {
        <div class="grid lg:grid-cols-2 gap-4">
          <ui-card>
            <ui-card-header>
              <ui-card-title class="flex items-center gap-2"><lucide-angular [img]="UserCircle" size="18" /> Seu perfil para a IA</ui-card-title>
              <ui-card-description>
                Estes dados são enviados como contexto silencioso ao agente para personalizar respostas e pré-sugerir setor/responsável.
                Apenas você vê e edita o seu perfil.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content class="space-y-4">
              <div class="space-y-2">
                <ui-label for="pn">Nome de exibição</ui-label>
                <input id="pn" type="text" [class]="inputCls" [(ngModel)]="profileForm.display_name" placeholder="Como você gosta de ser chamado" />
              </div>
              <div class="space-y-2">
                <ui-label for="pr">Função / cargo</ui-label>
                <input id="pr" type="text" [class]="inputCls" [(ngModel)]="profileForm.role_text" placeholder="Ex.: Engenheiro de manutenção, líder de produção..." />
              </div>
              <div class="space-y-2">
                <ui-label for="ps">Setor habitual</ui-label>
                <input id="ps" type="text" [class]="inputCls" [(ngModel)]="profileForm.default_setor" placeholder="Ex.: Elétrica" />
              </div>
              <div class="space-y-2">
                <ui-label for="pno">Observações livres</ui-label>
                <textarea id="pno" rows="4" [class]="textareaCls" [(ngModel)]="profileForm.notes"
                  placeholder="Ex.: 'Trabalho turno noite', 'Costumo abrir demandas relativas a compressores', 'Prefiro respostas em tom técnico'..."></textarea>
              </div>
              <div class="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <ui-button variant="outline" (click)="loadProfile()" [disabled]="savingProfile()">
                  <lucide-angular [img]="RefreshCw" size="14" /> Recarregar
                </ui-button>
                <ui-button (click)="saveProfile()" [disabled]="savingProfile()">
                  {{ savingProfile() ? 'Salvando...' : 'Salvar perfil' }}
                </ui-button>
              </div>
            </ui-card-content>
          </ui-card>

          <ui-card>
            <ui-card-header>
              <ui-card-title class="text-base">Estatísticas observadas</ui-card-title>
              <ui-card-description>Geradas automaticamente a partir das demandas que você confirmou.</ui-card-description>
            </ui-card-header>
            <ui-card-content class="space-y-3">
              @if (profile(); as p) {
                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-lg border border-slate-200 p-3">
                    <p class="text-xs text-slate-500 uppercase">Total de demandas</p>
                    <p class="text-2xl font-bold mt-1">{{ p.stats.total_demandas ?? 0 }}</p>
                  </div>
                  <div class="rounded-lg border border-slate-200 p-3">
                    <p class="text-xs text-slate-500 uppercase">Prioridade média</p>
                    <p class="text-2xl font-bold mt-1">{{ p.stats.prio_avg ?? '—' }}</p>
                  </div>
                </div>
                @if (topSetores().length) {
                  <div>
                    <p class="text-xs text-slate-500 uppercase mb-2">Setores mais frequentes</p>
                    <div class="space-y-1">
                      @for (s of topSetores(); track s.name) {
                        <div class="flex items-center justify-between text-sm">
                          <span>{{ s.name }}</span>
                          <span class="text-slate-500">{{ s.count }}</span>
                        </div>
                      }
                    </div>
                  </div>
                } @else {
                  <p class="text-xs text-slate-500">Confirme algumas demandas para começar a alimentar as estatísticas.</p>
                }
              } @else {
                <div class="grid grid-cols-2 gap-3">
                  @for (_ of [1,2]; track $index) {
                    <div class="rounded-lg border border-slate-200 p-3 space-y-2">
                      <div class="h-3 bg-slate-200 animate-pulse rounded w-24"></div>
                      <div class="h-8 bg-slate-200 animate-pulse rounded w-12"></div>
                    </div>
                  }
                </div>
              }
            </ui-card-content>
          </ui-card>
        </div>

        <ui-card>
          <ui-card-header class="flex flex-row items-start justify-between space-y-0">
            <div>
              <ui-card-title class="flex items-center gap-2"><lucide-angular [img]="Brain" size="18" /> Memórias do agente</ui-card-title>
              <ui-card-description>
                Resumos curtos das suas demandas confirmadas. O agente consulta as 5 mais recentes a cada conversa para detectar padrões.
              </ui-card-description>
            </div>
            <div class="flex gap-2">
              <ui-button variant="outline" size="sm" (click)="loadMemories()">
                <lucide-angular [img]="RefreshCw" size="14" /> Atualizar
              </ui-button>
              <ui-button variant="destructive" size="sm" (click)="clearAllMemories()" [disabled]="!memories().length">
                <lucide-angular [img]="Eraser" size="14" /> Esquecer tudo
              </ui-button>
            </div>
          </ui-card-header>
          <ui-card-content>
            @if (memories().length) {
              <ul class="divide-y divide-slate-100">
                @for (m of memories(); track m.id) {
                  <li class="py-2 flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <p class="text-sm">{{ m.summary }}</p>
                      <p class="text-xs text-slate-500 mt-0.5">
                        {{ m.created_at | date:'dd/MM/yyyy HH:mm' }}
                        @if (m.setor) { · {{ m.setor }} }
                        @if (m.prioridade !== null) { · P{{ m.prioridade }} }
                        @if (m.demanda_ref) { · #{{ m.demanda_ref }} }
                      </p>
                    </div>
                    <button type="button" (click)="deleteMemory(m)" class="text-red-600 hover:text-red-700 shrink-0 p-1"
                      [attr.aria-label]="'Esquecer memória ' + m.id">
                      <lucide-angular [img]="Trash2" size="14" />
                    </button>
                  </li>
                }
              </ul>
            } @else {
              <p class="text-sm text-slate-500">Sem memórias ainda. Cada demanda confirmada gera uma entrada aqui.</p>
            }
          </ui-card-content>
        </ui-card>
      }
    </div>
  `,
})
export class IaAdminPageComponent implements OnInit {
    readonly Brain = Brain;
    readonly BarChart3 = BarChart3;
    readonly BookOpen = BookOpen;
    readonly Upload = Upload;
    readonly Trash2 = Trash2;
    readonly RefreshCw = RefreshCw;
    readonly AlertTriangle = AlertTriangle;
    readonly CheckCircle2 = CheckCircle2;
    readonly UserCircle = UserCircle;
    readonly Eraser = Eraser;

    readonly inputCls = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
    readonly textareaCls = 'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

    tabs: { id: TabId; label: string; icon: typeof Brain }[] = [
        { id: 'ia-config', label: 'Configuração', icon: Brain },
        { id: 'ia-metricas', label: 'Métricas', icon: BarChart3 },
        { id: 'ia-conhecimento', label: 'Conhecimento', icon: BookOpen },
        { id: 'ia-perfil', label: 'Perfil & Memórias', icon: UserCircle },
    ];

    active = signal<TabId>('ia-config');

    private aiAdmin = inject(AiAdminService);
    cfg = this.aiAdmin.config;
    metrics = this.aiAdmin.metrics;
    knowledge = this.aiAdmin.knowledge;
    profile = this.aiAdmin.profile;
    memories = this.aiAdmin.memories;

    metricsDays = signal(30);
    saving = signal(false);
    uploading = signal(false);
    uploadSetor = '';
    savingProfile = signal(false);

    profileForm = { display_name: '', role_text: '', default_setor: '', notes: '' };

    form = {
        default_model: '',
        temperature: 0.3,
        system_prompt_extra: '',
        embedder_provider: '',
        embedder_model: '',
        kb_top_k: 5,
    };

    maxDayTokens = computed(() => {
        const m = this.metrics();
        if (!m) return 0;
        return Math.max(1, ...m.per_day.map((d) => d.tokens));
    });

    async ngOnInit() {
        await this.reload();
    }

    async reload() {
        try {
            const c = await this.aiAdmin.loadConfig();
            this.form = {
                default_model: c.default_model,
                temperature: c.temperature,
                system_prompt_extra: c.system_prompt_extra,
                embedder_provider: c.embedder_provider,
                embedder_model: c.embedder_model,
                kb_top_k: c.kb_top_k,
            };
        } catch (e: any) {
            toast.error('Falha ao carregar configuração', e?.message || '');
        }
        this.loadMetrics();
        this.loadKnowledge();
        this.loadProfile();
        this.loadMemories();
    }

    async saveConfig() {
        this.saving.set(true);
        try {
            await this.aiAdmin.updateConfig({ ...this.form });
            toast.success('Configuração salva');
        } catch (e: any) {
            toast.error('Falha ao salvar', e?.message || '');
        } finally {
            this.saving.set(false);
        }
    }

    async loadMetrics() {
        try {
            await this.aiAdmin.loadMetrics(this.metricsDays());
        } catch (e: any) {
            toast.error('Falha ao carregar métricas', e?.message || '');
        }
    }

    changeDays(d: number) {
        this.metricsDays.set(d);
        this.loadMetrics();
    }

    async loadKnowledge() {
        try {
            await this.aiAdmin.loadKnowledge();
        } catch (e: any) {
            toast.error('Falha ao listar documentos', e?.message || '');
        }
    }

    async onFileSelected(ev: Event) {
        const input = ev.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        this.uploading.set(true);
        try {
            await this.aiAdmin.uploadKnowledge(file, this.uploadSetor);
            toast.success('Documento indexado', file.name);
            this.uploadSetor = '';
        } catch (e: any) {
            toast.error('Falha no upload', e?.message || '');
        } finally {
            this.uploading.set(false);
            input.value = '';
        }
    }

    async confirmDelete(doc: KnowledgeDocument) {
        if (!confirm(`Remover "${doc.filename}" da base de conhecimento?`)) return;
        try {
            await this.aiAdmin.deleteKnowledge(doc.id);
            toast.success('Documento removido');
        } catch (e: any) {
            toast.error('Falha ao remover', e?.message || '');
        }
    }

    chunksOf(doc: KnowledgeDocument): number | string {
        const v = (doc.metadata as any)?.chunks;
        return typeof v === 'number' ? v : '-';
    }

    formatBytes(n: number): string {
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / 1024 / 1024).toFixed(1)} MB`;
    }

    barPct(value: number, max: number): number {
        return max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
    }

    async loadProfile() {
        try {
            const p = await this.aiAdmin.loadProfile();
            this.profileForm = {
                display_name: p.display_name ?? '',
                role_text: p.role_text ?? '',
                default_setor: p.default_setor ?? '',
                notes: p.notes ?? '',
            };
        } catch (e: any) {
            toast.error('Falha ao carregar perfil', e?.message || '');
        }
    }

    async saveProfile() {
        this.savingProfile.set(true);
        try {
            await this.aiAdmin.updateProfile({
                display_name: this.profileForm.display_name || null,
                role_text: this.profileForm.role_text || null,
                default_setor: this.profileForm.default_setor || null,
                notes: this.profileForm.notes || null,
            });
            toast.success('Perfil atualizado');
        } catch (e: any) {
            toast.error('Falha ao salvar perfil', e?.message || '');
        } finally {
            this.savingProfile.set(false);
        }
    }

    async loadMemories() {
        try {
            await this.aiAdmin.loadMemories(50);
        } catch (e: any) {
            toast.error('Falha ao carregar memórias', e?.message || '');
        }
    }

    async deleteMemory(m: MemoryItem) {
        if (!confirm('Remover esta memória? O agente esquecerá este fato.')) return;
        try {
            await this.aiAdmin.deleteMemory(m.id);
            toast.success('Memória removida');
        } catch (e: any) {
            toast.error('Falha ao remover', e?.message || '');
        }
    }

    async clearAllMemories() {
        if (!confirm('Apagar TODAS as memórias do seu histórico de IA? Esta ação não pode ser desfeita.')) return;
        try {
            const removed = await this.aiAdmin.clearMemories();
            toast.success(`${removed} memórias removidas`);
            await this.loadProfile();
        } catch (e: any) {
            toast.error('Falha ao limpar', e?.message || '');
        }
    }

    topSetores(): { name: string; count: number }[] {
        const stats = this.profile()?.stats?.setores || {};
        return Object.entries(stats)
            .map(([name, count]) => ({ name, count: count as number }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }
}
