import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Brain, BarChart3, BookOpen, Upload, Trash2, RefreshCw, AlertTriangle, CheckCircle2, UserCircle, Eraser, Key, Eye, EyeOff } from 'lucide-angular';

import { UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiCardDescription } from '../components/ui/card.component';
import { UiButton } from '../components/ui/button.component';
import { UiLabel } from '../components/ui/form-elements.component';
import { AiAdminService, KnowledgeDocument, MemoryItem } from '../services/ai-admin.service';
import { toast } from '../lib/toast';
import { SettingsTreeNavComponent, SettingsTreeGroup } from '../components/ui/settings-tree-nav.component';

type TabId = 'ia-modelo' | 'ia-chaves' | 'ia-metricas' | 'ia-conhecimento' | 'ia-perfil';

@Component({
    selector: 'app-ia-admin',
    standalone: true,
    imports: [
        CommonModule, FormsModule, DecimalPipe, LucideAngularModule,
        UiCard, UiCardContent, UiCardHeader, UiCardTitle, UiCardDescription,
        UiButton, UiLabel,
        SettingsTreeNavComponent,
    ],
    template: `
    <div class="flex gap-6 max-w-5xl min-h-[520px]">

      <!-- Tree nav -->
      <aside class="w-44 shrink-0 border-r border-border pr-2 pt-1">
        <app-settings-tree-nav
          [groups]="treeGroups"
          [active]="active()"
          (activeChange)="active.set($event)" />
      </aside>

      <!-- Content panel -->
      <div class="flex-1 min-w-0 space-y-4">

      @if (active() === 'ia-modelo') {
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
                  <p class="text-xs text-muted-foreground">Ex.: <code>groq:llama-3.3-70b-versatile</code>, <code>openai:gpt-4o-mini</code>, <code>anthropic:claude-3-5-sonnet-20241022</code>, <code>google:gemini-2.0-flash</code></p>
                </div>
                <div class="space-y-2">
                  <ui-label for="temp">Temperature ({{ form.temperature }})</ui-label>
                  <input id="temp" type="range" min="0" max="2" step="0.1"
                    [value]="form.temperature"
                    (input)="form.temperature = +$any($event.target).value"
                    class="w-full" />
                  <p class="text-xs text-muted-foreground">0 = determinístico • 2 = muito criativo</p>
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
                  <p class="text-xs text-muted-foreground">Concatenado às instruções base de todos os agentes. Para conhecimento extenso (manuais, normas), use a aba <strong>Conhecimento</strong>.</p>
                </div>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-border">
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
                        <div class="h-3 bg-muted animate-pulse rounded w-24"></div>
                        <div class="h-9 bg-muted animate-pulse rounded"></div>
                      </div>
                    }
                  </div>
                }
                <div class="space-y-2">
                  <div class="h-3 bg-muted animate-pulse rounded w-32"></div>
                  <div class="h-28 bg-muted animate-pulse rounded"></div>
                </div>
              </div>
            }
          </ui-card-content>
        </ui-card>

      }

      @if (active() === 'ia-chaves') {
        <!-- Chaves de API -->
        <ui-card>
          <ui-card-header>
            <ui-card-title class="flex items-center gap-2"><lucide-angular [img]="Key" size="18" /> Chaves de API</ui-card-title>
            <ui-card-description>Sobrescrevem o <code>.env</code> em runtime. O valor nunca é retornado — apenas se está configurado.</ui-card-description>
          </ui-card-header>
          <ui-card-content class="space-y-3">
            @for (p of apiProviders; track p.key) {
              <div class="grid sm:grid-cols-[160px_1fr_auto] items-center gap-3">
                <ui-label class="text-sm">{{ p.label }}</ui-label>
                <input [type]="showKey[p.key] ? 'text' : 'password'" [class]="inputCls"
                  [(ngModel)]="apiKeysForm[p.key]"
                  [placeholder]="cfg()?.[p.configuredField] ? '••••••••••••••••' : 'Cole a chave aqui'" />
                <div class="flex items-center gap-2">
                  <button type="button" (click)="showKey[p.key] = !showKey[p.key]"
                    class="h-8 w-8 inline-flex items-center justify-center rounded-md border border-input text-muted-foreground hover:text-foreground transition-colors">
                    <lucide-angular [img]="showKey[p.key] ? EyeOff : Eye" size="14" />
                  </button>
                  @if (cfg()?.[p.configuredField]) {
                    <span class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 whitespace-nowrap">
                      <lucide-angular [img]="CheckCircle2" size="12" /> OK
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-muted text-muted-foreground whitespace-nowrap">Não set</span>
                  }
                </div>
              </div>
            }
            <div class="flex justify-end pt-2 border-t border-border">
              <ui-button (click)="saveApiKeys()" [disabled]="savingKeys()">
                {{ savingKeys() ? 'Salvando...' : 'Salvar chaves' }}
              </ui-button>
            </div>
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
              <div class="rounded-lg border border-border bg-card p-4">
                <p class="text-xs text-muted-foreground uppercase">Runs</p>
                <p class="text-2xl font-bold mt-1">{{ m.totals.runs | number }}</p>
                <p class="text-xs text-muted-foreground mt-1">Sucesso: {{ m.totals.success_rate }}%</p>
              </div>
              <div class="rounded-lg border border-border bg-card p-4">
                <p class="text-xs text-muted-foreground uppercase">Tokens totais</p>
                <p class="text-2xl font-bold mt-1">{{ m.totals.total_tokens | number }}</p>
                <p class="text-xs text-muted-foreground mt-1">in {{ m.totals.input_tokens | number }} • out {{ m.totals.output_tokens | number }}</p>
              </div>
              <div class="rounded-lg border border-border bg-card p-4">
                <p class="text-xs text-muted-foreground uppercase">Custo estimado</p>
                <p class="text-2xl font-bold mt-1">$ {{ m.totals.cost_usd | number:'1.2-4' }}</p>
                <p class="text-xs text-muted-foreground mt-1">USD</p>
              </div>
              <div class="rounded-lg border border-border bg-card p-4">
                <p class="text-xs text-muted-foreground uppercase">Latência média</p>
                <p class="text-2xl font-bold mt-1">{{ m.totals.avg_latency_ms | number }} ms</p>
              </div>
            </div>

            <div class="grid lg:grid-cols-2 gap-4">
              <ui-card>
                <ui-card-header><ui-card-title class="text-base">Por modelo</ui-card-title></ui-card-header>
                <ui-card-content>
                  @if (m.per_model.length) {
                    <table class="w-full text-sm">
                      <thead class="text-xs text-muted-foreground border-b">
                        <tr><th class="text-left py-2">Modelo</th><th class="text-right">Runs</th><th class="text-right">Tokens</th><th class="text-right">Custo</th></tr>
                      </thead>
                      <tbody>
                        @for (r of m.per_model; track r.model_spec) {
                          <tr class="border-b border-border">
                            <td class="py-2 font-mono text-xs">{{ r.model_spec }}</td>
                            <td class="text-right">{{ r.runs | number }}</td>
                            <td class="text-right">{{ r.tokens | number }}</td>
                            <td class="text-right">$ {{ r.cost | number:'1.2-4' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  } @else {
                    <p class="text-sm text-muted-foreground">Nenhum uso registrado neste período.</p>
                  }
                </ui-card-content>
              </ui-card>

              <ui-card>
                <ui-card-header><ui-card-title class="text-base">Top usuários</ui-card-title></ui-card-header>
                <ui-card-content>
                  @if (m.per_user.length) {
                    <table class="w-full text-sm">
                      <thead class="text-xs text-muted-foreground border-b">
                        <tr><th class="text-left py-2">Usuário</th><th class="text-right">Runs</th><th class="text-right">Tokens</th><th class="text-right">Custo</th></tr>
                      </thead>
                      <tbody>
                        @for (r of m.per_user; track r.user_id) {
                          <tr class="border-b border-border">
                            <td class="py-2 truncate max-w-[200px]">{{ r.user_id }}</td>
                            <td class="text-right">{{ r.runs | number }}</td>
                            <td class="text-right">{{ r.tokens | number }}</td>
                            <td class="text-right">$ {{ r.cost | number:'1.2-4' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  } @else {
                    <p class="text-sm text-muted-foreground">Sem dados de usuários.</p>
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
                        <span class="w-24 text-muted-foreground font-mono">{{ d.day }}</span>
                        <div class="flex-1 bg-muted rounded h-4 relative overflow-hidden">
                          <div class="absolute inset-y-0 left-0 bg-primary/70"
                            [style.width.%]="barPct(d.tokens, maxDayTokens())"></div>
                        </div>
                        <span class="w-20 text-right">{{ d.tokens | number }} tk</span>
                        <span class="w-20 text-right text-muted-foreground">$ {{ d.cost | number:'1.2-4' }}</span>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-sm text-muted-foreground">Sem dados.</p>
                }
              </ui-card-content>
            </ui-card>
          } @else {
            <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              @for (_ of [1,2,3,4]; track $index) {
                <div class="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div class="h-3 bg-muted animate-pulse rounded w-20"></div>
                  <div class="h-8 bg-muted animate-pulse rounded w-16"></div>
                  <div class="h-3 bg-muted animate-pulse rounded w-24"></div>
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
              <span class="text-xs text-muted-foreground">.txt, .md, .pdf — até 10 MB. Setor amarra o documento ao filtro RAG do usuário.</span>
            </div>

            @if (knowledge().documents.length) {
              <div class="rounded-md border border-border overflow-hidden">
                <table class="w-full text-sm">
                  <thead class="text-xs text-muted-foreground bg-muted/40">
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
                      <tr class="border-t border-border">
                        <td class="px-3 py-2 truncate max-w-[280px]">{{ d.filename }}</td>
                        <td class="px-3 py-2 text-xs">
                          @if (d.setor) {
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{{ d.setor }}</span>
                          } @else {
                            <span class="text-muted-foreground">—</span>
                          }
                        </td>
                        <td class="px-3 py-2 text-xs text-muted-foreground">{{ d.content_type || '-' }}</td>
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
              <p class="text-sm text-muted-foreground">Nenhum documento ainda. Comece adicionando manuais, procedimentos ou tickets antigos.</p>
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
              <div class="flex justify-end gap-2 pt-2 border-t border-border">
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
                  <div class="rounded-lg border border-border p-3">
                    <p class="text-xs text-muted-foreground uppercase">Total de demandas</p>
                    <p class="text-2xl font-bold mt-1">{{ p.stats.total_demandas ?? 0 }}</p>
                  </div>
                  <div class="rounded-lg border border-border p-3">
                    <p class="text-xs text-muted-foreground uppercase">Prioridade média</p>
                    <p class="text-2xl font-bold mt-1">{{ p.stats.prio_avg ?? '—' }}</p>
                  </div>
                </div>
                @if (topSetores().length) {
                  <div>
                    <p class="text-xs text-muted-foreground uppercase mb-2">Setores mais frequentes</p>
                    <div class="space-y-1">
                      @for (s of topSetores(); track s.name) {
                        <div class="flex items-center justify-between text-sm">
                          <span>{{ s.name }}</span>
                          <span class="text-muted-foreground">{{ s.count }}</span>
                        </div>
                      }
                    </div>
                  </div>
                } @else {
                  <p class="text-xs text-muted-foreground">Confirme algumas demandas para começar a alimentar as estatísticas.</p>
                }
              } @else {
                <div class="grid grid-cols-2 gap-3">
                  @for (_ of [1,2]; track $index) {
                    <div class="rounded-lg border border-border p-3 space-y-2">
                      <div class="h-3 bg-muted animate-pulse rounded w-24"></div>
                      <div class="h-8 bg-muted animate-pulse rounded w-12"></div>
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
                      <p class="text-xs text-muted-foreground mt-0.5">
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
              <p class="text-sm text-muted-foreground">Sem memórias ainda. Cada demanda confirmada gera uma entrada aqui.</p>
            }
          </ui-card-content>
        </ui-card>
      }

      </div>
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
    readonly Key = Key;
    readonly Eye = Eye;
    readonly EyeOff = EyeOff;

    readonly inputCls = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
    readonly textareaCls = 'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

    tabs: { id: TabId; label: string; icon: typeof Brain }[] = [];

    readonly treeGroups: SettingsTreeGroup[] = [
        {
            label: 'Configuração',
            items: [
                { id: 'ia-modelo', label: 'Modelo & Comportamento', icon: Brain },
                { id: 'ia-chaves', label: 'Chaves de API', icon: Key },
            ],
        },
        {
            label: 'Dados',
            items: [
                { id: 'ia-metricas', label: 'Métricas', icon: BarChart3 },
                { id: 'ia-conhecimento', label: 'Conhecimento', icon: BookOpen },
            ],
        },
        {
            label: 'Usuário',
            items: [
                { id: 'ia-perfil', label: 'Perfil & Memórias', icon: UserCircle },
            ],
        },
    ];

    active = signal<string>('ia-modelo');

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

    savingKeys = signal(false);

    apiProviders: { key: string; label: string; configuredField: keyof import('../services/ai-admin.service').AiConfig }[] = [
        { key: 'openai_api_key', label: 'OpenAI', configuredField: 'openai_api_key_configured' },
        { key: 'anthropic_api_key', label: 'Anthropic', configuredField: 'anthropic_api_key_configured' },
        { key: 'google_api_key', label: 'Google', configuredField: 'google_api_key_configured' },
        { key: 'groq_api_key', label: 'Groq', configuredField: 'groq_api_key_configured' },
        { key: 'xai_api_key', label: 'xAI', configuredField: 'xai_api_key_configured' },
        { key: 'mistral_api_key', label: 'Mistral', configuredField: 'mistral_api_key_configured' },
    ];

    apiKeysForm: Record<string, string> = {
        openai_api_key: '', anthropic_api_key: '', google_api_key: '',
        groq_api_key: '', xai_api_key: '', mistral_api_key: '',
    };

    showKey: Record<string, boolean> = {
        openai_api_key: false, anthropic_api_key: false, google_api_key: false,
        groq_api_key: false, xai_api_key: false, mistral_api_key: false,
    };

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

    async saveApiKeys() {
        const patch: Record<string, string> = {};
        for (const [k, v] of Object.entries(this.apiKeysForm)) {
            if (v.trim()) patch[k] = v.trim();
        }
        if (!Object.keys(patch).length) {
            toast.error('Nenhuma chave preenchida', 'Preencha ao menos uma chave para salvar.');
            return;
        }
        this.savingKeys.set(true);
        try {
            await this.aiAdmin.updateConfig(patch);
            // Limpa os inputs após salvar e recarrega as flags
            for (const k of Object.keys(this.apiKeysForm)) this.apiKeysForm[k] = '';
            await this.aiAdmin.loadConfig();
            toast.success('Chaves salvas');
        } catch (e: any) {
            toast.error('Falha ao salvar chaves', e?.message || '');
        } finally {
            this.savingKeys.set(false);
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
