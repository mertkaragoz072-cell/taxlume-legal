import './styles.css';
import type { GameEvent } from '../core/events';
import { EXERCISES, GYM_PRICES } from '../data/exercises';
import { LOCATIONS } from '../data/locations';
import { formatMoney } from '../economy/economy';
import { hasMembership, membershipRemaining, type MembershipPlan } from '../fitness/membership';
import { PHYSIQUE_STAGES, xpForNextLevel } from '../fitness/progression';
import { baseOneRM, currentOneRM, energyPerRep, intensityOf, maxRepsAt, performance } from '../fitness/workout';
import type { Game } from '../app/game';
import type { GraphicsQuality } from '../world/renderer';
import { DEFAULT_CONFIG } from '../simulation/config';
import { DAY, formatDuration, HOUR, readClock } from '../simulation/time';

type Tab = 'gym' | 'status' | 'bank' | 'map' | 'menu';

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const pct = (v: number): number => Math.round(Math.max(0, Math.min(100, v)));

interface Confirm {
  title: string;
  body: string;
  yes: string;
  danger?: boolean;
  run: () => void;
}

export class UI {
  private tab: Tab = 'gym';
  private confirm: Confirm | null = null;
  private lastSaved = 0;

  constructor(
    private root: HTMLElement,
    private game: Game,
  ) {
    game.onChange(() => this.render());
    game.bus.on((e) => this.toast(e));
    root.addEventListener('click', (ev) => this.onClick(ev));
    window.setInterval(() => this.render(), 15000);
    this.render();
  }

  private toast(e: GameEvent): void {
    let box = this.root.querySelector('.toasts');
    if (!box) {
      box = document.createElement('div');
      box.className = 'toasts';
      this.root.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = `toast ${e.kind}`;
    t.textContent = e.message;
    box.appendChild(t);
    window.setTimeout(() => t.remove(), e.kind === 'error' || e.kind === 'levelUp' ? 4500 : 3000);
    while (box.children.length > 3) box.firstElementChild?.remove();
  }

  private ask(c: Confirm): void {
    this.confirm = c;
    this.render();
  }

  // ----- Event handling -----

  private onClick(ev: Event): void {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || (el as HTMLButtonElement).disabled) return;
    const g = this.game;
    const act = el.dataset.act!;
    const arg = el.dataset.arg ?? '';
    const s = g.workout.session;
    switch (act) {
      case 'tab':
        this.tab = arg as Tab;
        break;
      case 'buy': {
        const plan = arg as MembershipPlan;
        const price = GYM_PRICES[plan];
        const token = `${plan}:${Date.now()}:${Math.random()}`;
        const label = plan === 'monthly' ? 'monthly membership (30 days)' : 'day pass (24 hours)';
        this.ask({ title: 'Confirm purchase', body: `Buy a ${label} for ${formatMoney(price)}? You have ${formatMoney(g.state.money)}.`, yes: `Pay ${formatMoney(price)}`, run: () => g.buyMembership(plan, token) });
        return;
      }
      case 'start': {
        const d = EXERCISES.bench!;
        const w = g.state.gym.lifts.bench?.lastWeight || 25;
        g.workout.startWorkout(Math.max(d.minWeight, w), 8);
        return;
      }
      case 'weight':
        if (s) g.workout.setWeight(s.weight + Number(arg));
        return;
      case 'reps':
        if (s) g.workout.setTargetReps(s.targetReps + Number(arg));
        return;
      case 'set':
        void g.workout.performSet();
        return;
      case 'stop':
        g.workout.stopSet();
        el.setAttribute('disabled', '');
        return;
      case 'rest':
        void g.workout.rest(Number(arg) || 90);
        return;
      case 'end':
        void g.workout.endWorkout();
        return;
      case 'wait':
        g.passTime(Number(arg) * HOUR);
        return;
      case 'save':
        void g.save().then(() => {
          this.lastSaved = Date.now();
          this.toast({ kind: 'success', message: 'Game saved.' });
          this.render();
        });
        return;
      case 'export': {
        const blob = new Blob([JSON.stringify(g.state, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'life-sim-save.json';
        a.click();
        URL.revokeObjectURL(a.href);
        return;
      }
      case 'gfx':
        g.setGraphics(arg as GraphicsQuality);
        return;
      case 'reset':
        this.ask({ title: 'Start a new game?', body: 'This permanently deletes your current progress.', yes: 'Delete & restart', danger: true, run: () => void g.resetGame() });
        return;
      case 'yes': {
        const c = this.confirm;
        this.confirm = null;
        c?.run();
        this.render();
        return;
      }
      case 'no':
        this.confirm = null;
        break;
    }
    this.render();
  }

  // ----- Rendering -----

  render(): void {
    const toasts = this.root.querySelector('.toasts');
    this.root.innerHTML = `${this.hud()}<div class="sheet"><div class="sheet-body">${this.sheet()}</div>${this.tabs()}</div>${this.modal()}`;
    if (toasts) this.root.appendChild(toasts);
  }

  private hud(): string {
    const st = this.game.state;
    const c = st.character;
    const cfg = DEFAULT_CONFIG;
    // Compact meter strip: icon + thin bar. Exact numbers live in the Status tab.
    const meter = (icon: string, label: string, v: number, low: boolean, color: string) =>
      `<div class="m ${low ? 'low' : ''}" role="img" aria-label="${label} ${pct(v)}"><span>${icon}</span><div class="mb"><i style="width:${pct(v)}%;background:${low ? 'var(--bad)' : color}"></i></div></div>`;
    return `<div class="hud">
      <div class="hud-row">
        <span class="lv">LV ${c.level}</span>
        <div class="xpbar"><i style="width:${pct((c.xp / xpForNextLevel(c.level)) * 100)}%"></i></div>
        <span class="clock">${formatClockCompact(st.time)}</span>
        <span class="money">${formatMoney(st.money)}</span>
      </div>
      <div class="meters">
        ${meter('❤️', 'Health', c.health, c.health <= 35, 'var(--good)')}
        ${meter('⚡', 'Energy', c.energy, c.energy <= cfg.energyWarn, 'var(--accent)')}
        ${meter('🍽️', 'Food', 100 - c.hunger, c.hunger >= cfg.hungerWarn, 'var(--warn)')}
        ${meter('💧', 'Water', c.hydration, c.hydration <= cfg.hydrationWarn, '#4db8ff')}
        ${meter('😴', 'Rested', 100 - c.sleepiness, c.sleepiness >= cfg.sleepinessWarn, '#a68bff')}
        ${meter('😊', 'Mood', c.happiness, c.happiness <= 25, '#ff7ab8')}
      </div>
    </div>`;
  }

  private tabs(): string {
    const t = (id: Tab, icon: string, label: string) => `<button class="tab ${this.tab === id ? 'on' : ''}" data-act="tab" data-arg="${id}"><span>${icon}</span>${label}</button>`;
    return `<nav class="tabs">${t('gym', '🏋️', 'Gym')}${t('status', '🧍', 'Status')}${t('bank', '💵', 'Bank')}${t('map', '🗺️', 'Map')}${t('menu', '⚙️', 'Menu')}</nav>`;
  }

  private sheet(): string {
    switch (this.tab) {
      case 'gym':
        return this.gymTab();
      case 'status':
        return this.statusTab();
      case 'bank':
        return this.bankTab();
      case 'map':
        return this.mapTab();
      case 'menu':
        return this.menuTab();
    }
  }

  private gymTab(): string {
    const g = this.game;
    const w = g.workout;
    const st = g.state;
    // The workout panel is only ever shown while training is actually allowed.
    const s = w.canTrain ? w.session : null;
    const d = EXERCISES.bench!;
    const member = hasMembership(st);
    const remain = membershipRemaining(st);
    const left = member ? (remain >= DAY ? `${Math.ceil(remain / DAY)} days left` : `${formatDuration(remain)} left`) : 'No active pass';

    if (!s) {
      const lift = st.gym.lifts.bench;
      const summary = w.lastSummary;
      return `${summary ? `<div class="card"><b>Workout complete</b><div class="muted small">${summary.sets} ${summary.sets === 1 ? 'set' : 'sets'} · ${summary.reps} reps · ${formatDuration(summary.seconds)} · +${summary.xp} XP · −${summary.energySpent} energy · strength +${summary.strengthGain}${summary.levelsGained ? ' · <b style="color:var(--accent)">Level up!</b>' : ''}</div></div>` : ''}
      <div class="card"><div class="row"><div><b>Membership</b> <span class="pill ${member ? 'good' : 'bad'}">${member ? 'ACTIVE' : 'NONE'}</span><div class="muted small">${left}</div></div>
        <div class="mini-btns"><button class="btn alt sm" data-act="buy" data-arg="dayPass">Day ${formatMoney(GYM_PRICES.dayPass)}</button><button class="btn alt sm" data-act="buy" data-arg="monthly">Month ${formatMoney(GYM_PRICES.monthly)}</button></div></div></div>
      <div class="card"><div class="row"><div><b>${d.name}</b><div class="muted small">${lift ? `Best ${lift.bestWeight} kg · ${lift.totalReps} reps · ${lift.totalSets} sets` : 'Not tried yet'} · today's max ≈ ${Math.floor(currentOneRM(st, 'bench'))} kg</div></div></div>
        <button class="btn block" style="margin-top:8px" data-act="start" ${member ? '' : 'disabled'}>${member ? 'Start workout' : 'Buy a pass to train'}</button></div>
      <p class="muted small">Squat, deadlift, pull-ups, curls and cardio arrive in a later milestone.</p>`;
    }

    const lifting = w.phase === 'lifting';
    const base = baseOneRM(st, 'bench');
    const today = currentOneRM(st, 'bench');
    const intensity = intensityOf(st, 'bench', s.weight);
    const capacity = maxRepsAt(today, s.weight);
    const verdict: [string, string] = capacity === 0 ? ['Too heavy now', 'bad'] : capacity < s.targetReps ? [`May fail near rep ${capacity}`, 'warn'] : intensity < 0.35 ? ['Too light to build strength', 'warn'] : ['Good working weight', 'good'];
    const cost = energyPerRep(st, 'bench', s.weight);
    const dis = w.busy ? 'disabled' : '';

    if (lifting) {
      return `<div class="lift-live">
        <div class="big-count"><b>${s.setReps}</b><span>/${s.targetReps}</span></div>
        <div style="flex:1"><div class="row small"><b>${d.name} · ${s.weight} kg</b><span class="muted">Set ${s.completedSets + 1}</span></div>
        <div class="progress"><i style="width:${(s.setReps / s.targetReps) * 100}%"></i></div>
        <div class="row muted small"><span>Energy ${pct(st.character.energy)}</span><span>+${s.xpEarned.toFixed(1)} XP</span></div></div>
      </div>
      <button class="btn danger block" data-act="stop">■ Stop after this rep</button>`;
    }
    return `<div class="row steppers">
        <div class="stepper"><button data-act="weight" data-arg="-${d.step * 2}" ${dis}>−</button><div class="val">${s.weight}<small>kg</small></div><button data-act="weight" data-arg="${d.step * 2}" ${dis}>+</button></div>
        <div class="stepper"><button data-act="reps" data-arg="-1" ${dis}>−</button><div class="val">${s.targetReps}<small>reps</small></div><button data-act="reps" data-arg="1" ${dis}>+</button></div>
      </div>
      <div class="row small" style="margin:8px 0 2px"><span class="pill ${verdict[1]}">${verdict[0]}</span><span class="muted">${cost.toFixed(1)} energy/rep · max ${Math.floor(today)}/${Math.floor(base)} kg</span></div>
      <div class="row small muted"><span>Set ${s.completedSets + 1} · ${s.totalReps} reps done · +${s.xpEarned.toFixed(0)} XP</span><span>Recovery debt ${pct(st.gym.fatigue)}%</span></div>
      <div class="btns3"><button class="btn" data-act="set" ${dis}>${w.busy ? 'Resting…' : 'Start set'}</button>
      <button class="btn alt" data-act="rest" data-arg="${d.restSeconds}" ${dis}>Rest ${d.restSeconds}s</button>
      <button class="btn danger" data-act="end" ${dis}>End</button></div>`;
  }

  private statusTab(): string {
    const st = this.game.state;
    const c = st.character;
    const stat = (label: string, v: number, color: string) =>
      `<div class="stat"><div class="row"><span>${label}</span><b>${v.toFixed(1)}</b></div><div class="progress"><i style="width:${pct(v)}%;background:${color}"></i></div></div>`;
    const stage = PHYSIQUE_STAGES[this.game.physiqueStage]!;
    const next = PHYSIQUE_STAGES[this.game.physiqueStage + 1];
    const need = (label: string, v: number, color: string) =>
      `<div class="stat"><div class="row"><span>${label}</span><b>${Math.round(v)}</b></div><div class="progress"><i style="width:${pct(v)}%;background:${color}"></i></div></div>`;
    return `<h2>Your character</h2>
      <h3>Needs</h3>${need('Health', c.health, 'var(--good)')}${need('Energy', c.energy, 'var(--accent)')}${need('Fullness (100 = not hungry)', 100 - c.hunger, 'var(--warn)')}${need('Hydration', c.hydration, '#4db8ff')}${need('Rested (100 = fresh)', 100 - c.sleepiness, '#a68bff')}
      <div class="card"><div class="row"><span>Physique</span><b>${stage.name}</b></div><div class="muted small">${next ? `Next stage at strength ${next.minStrength}` : 'Maximum physique reached'}</div></div>
      <h3>Training</h3>${stat('Strength', c.strength, 'var(--accent)')}${stat('Endurance', c.endurance, '#4db8ff')}${stat('Fitness', c.fitness, 'var(--good)')}
      <div class="stat"><div class="row"><span>Recovery debt</span><b>${st.gym.fatigue.toFixed(0)}%</b></div><div class="progress"><i style="width:${pct(st.gym.fatigue)}%;background:var(--warn)"></i></div></div>
      <div class="muted small">Performance today: ${Math.round(performance(st) * 100)}% — energy, recovery, food, water and sleep all affect your lifts.</div>
      <h3>Well-being</h3>${stat('Happiness', c.happiness, '#ff7ab8')}${stat('Mental well-being', c.wellbeing, '#a68bff')}
      <h3>Time</h3><button class="btn alt block" data-act="wait" data-arg="1">Take a break (1 hour)</button>
      <p class="muted small">Resting restores energy and burns off recovery debt, but hunger and thirst keep rising. Food, home and sleep arrive in Milestone 2.</p>`;
  }

  private bankTab(): string {
    const st = this.game.state;
    const list = [...st.transactions].reverse().slice(0, 60);
    return `<div class="row"><h2>Bank</h2><b style="color:var(--accent);font-size:20px">${formatMoney(st.money)}</b></div>
      ${
        list.length
          ? list.map((t) => `<div class="tx"><div>${esc(t.description)}<small>${formatClockShort(t.time)} · ${t.category}</small></div><div class="${t.amount >= 0 ? 'pos' : 'neg'}">${t.amount >= 0 ? '+' : '−'}${formatMoney(Math.abs(t.amount))}</div></div>`).join('')
          : '<p class="muted">No transactions yet. Buying a gym pass will show up here.</p>'
      }
      <p class="muted small">Jobs, rent and bills arrive in Milestone 3. For now your starting savings are all you have — spend them wisely.</p>`;
  }

  private mapTab(): string {
    return `<h2>Locations</h2>${LOCATIONS.map((l) => {
      const here = l.id === this.game.state.location;
      const open = l.milestone <= 1;
      return `<div class="loc ${open ? '' : 'off'}"><div class="ic">${l.icon}</div><div style="flex:1"><b>${l.name}</b><div class="muted small">${l.blurb}</div></div>${
        here ? '<span class="pill good">You are here</span>' : `<span class="pill">Milestone ${l.milestone}</span>`
      }</div>`;
    }).join('')}`;
  }

  private menuTab(): string {
    return `<h2>Menu</h2>
      <div class="card"><b>Save</b><div class="muted small">Autosaves after every set, purchase and when the app goes to the background.${this.lastSaved ? ` Last manual save ${new Date(this.lastSaved).toLocaleTimeString()}.` : ''}</div>
      <div class="btns"><button class="btn" data-act="save">Save now</button><button class="btn alt" data-act="export">Export</button></div></div>
      <div class="card"><b>Graphics</b><div class="muted small">Glow, light shafts and colour grading. Auto turns them off if your device runs slowly.</div>
      <div class="btns3" style="grid-template-columns:repeat(3,1fr)">${(['auto', 'high', 'low'] as GraphicsQuality[]).map((q) => `<button class="btn ${this.game.graphics === q ? '' : 'alt'} sm" data-act="gfx" data-arg="${q}">${q[0]!.toUpperCase() + q.slice(1)}</button>`).join('')}</div></div>
      <div class="card"><b>New game</b><div class="muted small">Delete progress and start over.</div><button class="btn danger block" style="margin-top:8px" data-act="reset">Start new game…</button></div>
      <p class="muted small">Life Simulator · Milestone 1 build</p>`;
  }

  private modal(): string {
    const c = this.confirm;
    if (!c) return '';
    return `<div class="modal-bg"><div class="modal"><h2>${esc(c.title)}</h2><p>${esc(c.body)}</p><div class="btns"><button class="btn alt" data-act="no">Cancel</button><button class="btn ${c.danger ? 'danger' : ''}" data-act="yes">${esc(c.yes)}</button></div></div></div>`;
  }
}

function formatClockCompact(seconds: number): string {
  const c = readClock(seconds);
  return `${c.weekday} ${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`;
}

function formatClockShort(seconds: number): string {
  const day = Math.floor(seconds / DAY) + 1;
  const h = Math.floor((seconds % DAY) / HOUR);
  const m = Math.floor((seconds % HOUR) / 60);
  return `Day ${day} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
