import './styles.css';
import type { GameEvent } from '../core/events';
import { EXERCISES, GYM_PRICES } from '../data/exercises';
import { LOCATIONS } from '../data/locations';
import { formatMoney } from '../economy/economy';
import { hasMembership, membershipRemaining, type MembershipPlan } from '../fitness/membership';
import { PHYSIQUE_STAGES, xpForNextLevel } from '../fitness/progression';
import { baseOneRM, currentOneRM, energyPerRep, intensityOf, maxRepsAt, performance } from '../fitness/workout';
import type { Game } from '../app/game';
import { DEFAULT_CONFIG } from '../simulation/config';
import { DAY, formatClock, formatDuration, HOUR } from '../simulation/time';

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
    const s = g.session;
    switch (act) {
      case 'tab':
        this.tab = arg as Tab;
        break;
      case 'buy': {
        const plan = arg as MembershipPlan;
        const price = GYM_PRICES[plan];
        const label = plan === 'monthly' ? 'monthly membership (30 days)' : 'day pass (24 hours)';
        this.ask({ title: 'Confirm purchase', body: `Buy a ${label} for ${formatMoney(price)}? You have ${formatMoney(g.state.money)}.`, yes: `Pay ${formatMoney(price)}`, run: () => g.buyMembership(plan) });
        return;
      }
      case 'start': {
        const d = EXERCISES.bench!;
        const w = g.state.gym.lifts.bench?.lastWeight || 25;
        g.startWorkout(Math.max(d.minWeight, w), 8);
        return;
      }
      case 'weight':
        if (s) g.setWeight(s.weight + Number(arg));
        return;
      case 'reps':
        if (s) g.setTargetReps(s.targetReps + Number(arg));
        return;
      case 'set':
        void g.performSet();
        return;
      case 'stop':
        g.stopSet();
        el.setAttribute('disabled', '');
        return;
      case 'rest':
        void g.rest(Number(arg) || 90);
        return;
      case 'end':
        void g.endWorkout();
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
    const bar = (label: string, v: number, good: boolean, color: string, warnLow: boolean) =>
      `<div class="need ${warnLow ? 'low' : ''}">${label}<b>${pct(v)}</b><div class="bar"><i style="width:${pct(v)}%;background:${good ? color : 'var(--bad)'}"></i></div></div>`;
    const cfg = DEFAULT_CONFIG;
    const alerts: string[] = [];
    if (c.energy <= cfg.energyWarn) alerts.push('⚡ Low energy');
    if (c.hunger >= cfg.hungerWarn) alerts.push('🍽️ Hungry');
    if (c.hydration <= cfg.hydrationWarn) alerts.push('💧 Thirsty');
    if (c.sleepiness >= cfg.sleepinessWarn) alerts.push('😴 Sleepy');
    if (c.health < 40) alerts.push('❤️ Poor health');
    if (st.gym.fatigue > 70) alerts.push('🔥 Overtrained');
    return `<div class="hud">
      <div class="hud-row"><span class="clock">${formatClock(st.time)}</span><span class="money">${formatMoney(st.money)}</span></div>
      <div class="level"><span class="lv">LV ${c.level}</span><div class="xpbar"><i style="width:${pct((c.xp / xpForNextLevel(c.level)) * 100)}%"></i></div><span class="muted small">${Math.floor(c.xp)}/${xpForNextLevel(c.level)} XP</span></div>
      <div class="needs">
        ${bar('Health', c.health, c.health > 35, 'var(--good)', c.health <= 35)}
        ${bar('Energy', c.energy, c.energy > cfg.energyWarn, 'var(--accent)', c.energy <= cfg.energyWarn)}
        ${bar('Food', 100 - c.hunger, c.hunger < cfg.hungerWarn, 'var(--warn)', c.hunger >= cfg.hungerWarn)}
        ${bar('Water', c.hydration, c.hydration > cfg.hydrationWarn, '#4db8ff', c.hydration <= cfg.hydrationWarn)}
        ${bar('Rested', 100 - c.sleepiness, c.sleepiness < cfg.sleepinessWarn, '#a68bff', c.sleepiness >= cfg.sleepinessWarn)}
        ${bar('Mood', c.happiness, c.happiness > 25, '#ff7ab8', c.happiness <= 25)}
      </div>
      ${alerts.length ? `<div class="alerts">${alerts.map((a) => `<span class="alert">${a}</span>`).join('')}</div>` : ''}
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
    const st = g.state;
    const s = g.session;
    const d = EXERCISES.bench!;
    const member = hasMembership(st);
    const remain = membershipRemaining(st);
    const memberCard = `<div class="card"><div class="row"><div><b>Membership</b><div class="muted">${
      member ? `Active · ${remain >= DAY ? `${Math.ceil(remain / DAY)} days left` : `${formatDuration(remain)} left`}` : 'None — buy a pass to train'
    }</div></div><span class="pill ${member ? 'good' : 'bad'}">${member ? 'ACTIVE' : 'EXPIRED'}</span></div>
      <div class="btns"><button class="btn alt" data-act="buy" data-arg="dayPass">Day pass<br><small>${formatMoney(GYM_PRICES.dayPass)}</small></button>
      <button class="btn alt" data-act="buy" data-arg="monthly">Monthly<br><small>${formatMoney(GYM_PRICES.monthly)}</small></button></div></div>`;

    if (!s) {
      const lift = st.gym.lifts.bench;
      const summary = g.lastSummary;
      return `${summary ? `<div class="card"><b>Workout complete</b><div class="muted">${summary.sets} ${summary.sets === 1 ? 'set' : 'sets'} · ${summary.reps} reps · ${formatDuration(summary.seconds)}<br>+${summary.xp} XP · −${summary.energySpent} energy · strength +${summary.strengthGain}${summary.levelsGained ? ` · <b style="color:var(--accent)">Level up!</b>` : ''}</div></div>` : ''}
      ${memberCard}
      <div class="card"><div class="row"><div><b>${d.name}</b><div class="muted">${lift ? `Best ${lift.bestWeight} kg · ${lift.totalReps} reps in ${lift.totalSets} sets` : 'Not tried yet'}</div><div class="muted small">Today's max ≈ ${Math.floor(currentOneRM(st, 'bench'))} kg (1 rep)</div></div></div>
      <button class="btn block" style="margin-top:10px" data-act="start" ${member ? '' : 'disabled'}>${member ? 'Start workout' : 'Membership required'}</button></div>
      <p class="muted small">Squat, deadlift, pull-ups, curls and cardio arrive in Milestone 6. Their machines are already in the gym.</p>`;
    }

    const lifting = g.phase === 'lifting';
    const base = baseOneRM(st, 'bench');
    const today = currentOneRM(st, 'bench');
    const intensity = intensityOf(st, 'bench', s.weight);
    const capacity = maxRepsAt(today, s.weight);
    const verdict = capacity === 0 ? ['Too heavy right now', 'bad'] : capacity < s.targetReps ? [`Likely to fail near rep ${capacity}`, 'warn'] : intensity < 0.35 ? ['Too light to build strength', 'warn'] : ['Good working weight', 'good'];
    const cost = energyPerRep(st, 'bench', s.weight);

    if (lifting) {
      return `<div class="big-count"><b>${s.setReps}</b><span> / ${s.targetReps}</span><div class="muted">Set ${s.completedSets + 1} · ${s.weight} kg</div></div>
        <div class="progress"><i style="width:${(s.setReps / s.targetReps) * 100}%"></i></div>
        <div class="row muted small"><span>Energy ${pct(st.character.energy)}</span><span>+${s.xpEarned.toFixed(1)} XP</span></div>
        <button class="btn alt block" style="margin-top:12px" data-act="stop">Stop after this rep</button>`;
    }
    return `<div class="row"><h2>${d.name}</h2><span class="pill">Set ${s.completedSets + 1}</span></div>
      <div class="row card">
        <div class="stepper"><button data-act="weight" data-arg="-${d.step * 2}" ${g.busy ? 'disabled' : ''}>−</button><div class="val">${s.weight}<small>kg</small></div><button data-act="weight" data-arg="${d.step * 2}" ${g.busy ? 'disabled' : ''}>+</button></div>
        <div class="stepper"><button data-act="reps" data-arg="-1" ${g.busy ? 'disabled' : ''}>−</button><div class="val">${s.targetReps}<small>reps</small></div><button data-act="reps" data-arg="1" ${g.busy ? 'disabled' : ''}>+</button></div>
      </div>
      <div class="row small"><span class="pill ${verdict[1]}">${verdict[0]}</span><span class="muted">${cost.toFixed(1)} energy/rep · max ${Math.floor(today)}/${Math.floor(base)} kg</span></div>
      <div class="row small muted" style="margin-top:6px"><span>Recovery debt ${pct(st.gym.fatigue)}%</span><span>${s.completedSets} ${s.completedSets === 1 ? 'set' : 'sets'} · ${s.totalReps} reps · +${s.xpEarned.toFixed(0)} XP</span></div>
      <div class="btns"><button class="btn" data-act="set" ${g.busy ? 'disabled' : ''}>${g.busy ? 'Resting…' : 'Start set'}</button>
      <button class="btn alt" data-act="rest" data-arg="${d.restSeconds}" ${g.busy ? 'disabled' : ''}>Rest ${d.restSeconds}s</button></div>
      <button class="btn danger block" style="margin-top:8px" data-act="end" ${g.busy ? 'disabled' : ''}>End workout</button>`;
  }

  private statusTab(): string {
    const st = this.game.state;
    const c = st.character;
    const stat = (label: string, v: number, color: string) =>
      `<div class="stat"><div class="row"><span>${label}</span><b>${v.toFixed(1)}</b></div><div class="progress"><i style="width:${pct(v)}%;background:${color}"></i></div></div>`;
    const stage = PHYSIQUE_STAGES[this.game.physiqueStage]!;
    const next = PHYSIQUE_STAGES[this.game.physiqueStage + 1];
    return `<h2>Your character</h2>
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
      <div class="card"><b>New game</b><div class="muted small">Delete progress and start over.</div><button class="btn danger block" style="margin-top:8px" data-act="reset">Start new game…</button></div>
      <p class="muted small">Life Simulator · Milestone 1 build</p>`;
  }

  private modal(): string {
    const c = this.confirm;
    if (!c) return '';
    return `<div class="modal-bg"><div class="modal"><h2>${esc(c.title)}</h2><p>${esc(c.body)}</p><div class="btns"><button class="btn alt" data-act="no">Cancel</button><button class="btn ${c.danger ? 'danger' : ''}" data-act="yes">${esc(c.yes)}</button></div></div></div>`;
  }
}

function formatClockShort(seconds: number): string {
  const day = Math.floor(seconds / DAY) + 1;
  const h = Math.floor((seconds % DAY) / HOUR);
  const m = Math.floor((seconds % HOUR) / 60);
  return `Day ${day} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
