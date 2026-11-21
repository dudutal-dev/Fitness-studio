// מסך המאמן והפרופיל: החלפת מאמן, הגדרות קול, עריכת פרופיל ויעדים, גיבוי ושחזור.
import { LANG, setLang } from '../lang.js';
import { html, esc, on, sheet, toast, icon } from '../ui/dom.js';
import { get, set, regenerateWeek, exportData, importData, resetAll } from '../store.js';
import { COACHES, coachesFor } from '../data/coaches.js';
import { GOALS, INJURIES, LEVEL_NAMES, goalsFor } from '../engine/program.js';
import { isCali, isMix, hasCali, mixCaliCount, recommendTrack } from '../engine/cali.js';
import { switchTrack, equipChips, setEquip, recommendSheet } from './cali-ui.js';
import { isMob, mobCount } from '../engine/mob.js';
import { isRun } from '../engine/running.js';
import { isHiit } from '../engine/hiit.js';
import { isPil, PIL_LEVELS, pilLevel } from '../engine/pil.js';
import { isYoga, YOGA_LEVELS, yogaLevel } from '../engine/yoga.js';
import { isTai, TAI_LEVELS, taiLevel, TAI_MINUTES } from '../engine/tai.js';
import { isWalk, WALK_LEVELS, walkLevel, WALK_MINUTES } from '../engine/walking.js';
import { flagChips, flagNotes } from './mob-ui.js';
import { mobSettings, bindMobSettings } from './mob-ui.js';
import { TRACKS, goalDesc } from './onboarding.js';
import { BRAND } from '../brand.js';
import { licenseText } from '../lic.js';
import { runLevelFrom3k } from '../engine/running.js';
import { say, stop, unlock, voiceCacheStatus, downloadVoice } from '../coach/voice.js';
import { parse3k, liftsFrom } from './onboarding.js';
import { ANCHOR_LIFTS } from '../engine/progression.js';
import { fmtTime } from '../ui/dom.js';
import { watchCard, bindWatchCard } from './garmin.js';
import { nameEntry } from '../data/names.js';
import { APP_VERSION } from '../version.js';
import { applyTheme } from '../theme.js';
import { backupNow, lastBackupText } from '../backup.js';
import { reminderCard, bindReminders } from './reminders-ui.js';
import { syncReminders } from '../reminders.js';

// אילו סעיפי הגדרות פתוחים — נשמר בין רינדורים כדי שהסעיף לא ייסגר אחרי כל שינוי
const openSec = new Set();
const sec = (id, title, sub, body) => `<details class="card acc set-sec" data-sec="${id}" id="${id}" ${openSec.has(id) ? 'open' : ''}><summary><span class="grow"><b>${title}</b><span class="sub">${sub}</span></span></summary><div class="acc-body">${body}</div></details>`;

export function renderCoach(root) {
  const s = get();
  const p = s.profile;
  const st = s.settings;
  const cali = isCali(p), mix = isMix(p), mob = isMob(p), run = isRun(p), hiit = isHiit(p), pil = isPil(p), yoga = isYoga(p), tai = isTai(p), walk = isWalk(p), track = walk ? 'walk' : tai ? 'tai' : yoga ? 'yoga' : pil ? 'pil' : hiit ? 'hiit' : run ? 'run' : mob ? 'mob' : cali ? 'cali' : mix ? 'mix' : 'gym';
  const noGym = cali || mob || run || hiit || pil || yoga || tai || walk, mobN = mobCount(p);
  const recMix = mix ? (() => { const r = recommendTrack({ gymAccess: p.gymAccess || 'yes', goal: p.goal, days: p.days, injuries: p.injuries }); return r.track === 'mix' ? r.mixCali : null; })() : null;
  if (sessionStorage.getItem('scrollTo') === 'reminders') openSec.add('reminders');
  root.innerHTML = html`<div class="page-head row between" style="align-items:center"><div class="h1">Settings</div>
      <div class="seg lang-seg" data-lang role="group" aria-label="Language / שפה"><button data-v="he" class="${LANG === 'he' ? 'on' : ''}" lang="he">עברית</button><button data-v="en" class="${LANG === 'en' ? 'on' : ''}" lang="en">English</button></div></div>
    <div class="h2" style="margin-top:0">Your coach</div>
    <div class="coach-pick ${cali || mob || hiit || pil || yoga || tai || walk ? 'solo' : ''}">${coachesFor(track).map((c) => html`
      <button class="coach-card ${p.coach === c.id ? 'on' : ''}" data-coach="${c.id}"><img src="${c.img}" alt="${c.name}"><span class="check">✓</span>
        <div class="cap"><b>${c.name}</b><span>${c.title}</span></div></button>`)}</div>
    <p class="sub t-foot" style="margin-top:10px">${esc(COACHES[p.coach].bio)}${mix ? ` Calisthenics workouts are coached by ${COACHES.maya.name}.` : ''}${mobN ? ` Mobility workouts are coached by ${COACHES.tamar.name}.` : ''}</p>

    <div class="h2">Your track</div>
    <div class="card tight"><div class="seg" data-track-seg>${['gym', 'cali', 'run', 'walk', 'hiit', 'pil', 'yoga', 'tai', 'mob', 'mix'].map((k) => `<button data-track="${k}" class="${track === k ? 'on' : ''}">${TRACKS[k].name}</button>`).join('')}</div>
      <div class="sub t-foot" style="margin-top:8px">${esc(TRACKS[track].desc)} Switching tracks builds a new plan and changes your coach; your history, weigh-ins and nutrition are kept.</div>
      <button class="btn sm teal block" style="margin-top:10px" data-rec-track>${icon('sparkle', 'width="16" height="16"')} Not ${p.sex === 'f' ? 'sure' : 'sure'}? Get a recommendation</button>
      ${hasCali(p) ? `<div style="font-weight:700;margin:12px 0 6px">My equipment${mix ? ' for calisthenics' : ''}</div>${equipChips(p.cali.equip)}<div class="sub t-foot" style="margin-top:6px">Changing equipment updates your workouts right away. Your ladder steps are kept.</div>` : ''}</div>

    <div class="h2">Mobility & flexibility</div>
    ${mobSettings(p)}

    <div class="h2">Settings</div>
    ${sec('reminders', 'Reminders', 'Workout, water and weigh-in', reminderCard())}
    ${sec('look', 'Appearance', 'Light, dark or match the phone', html`<div class="card"><div class="seg" data-theme-seg>
      ${[['dark', 'Dark'], ['light', 'Light'], ['auto', 'Auto']].map(([k, t]) => `<button data-th="${k}" class="${(st.theme || 'dark') === k ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="sub" style="font-size:12px;margin-top:8px">"Auto" switches between light and dark by itself, following the phone's settings. Workout demos stay on a dark background.</div></div>`)}
    ${sec('voice', 'Voice and cues', 'Counting, captions and volume', html`<div class="card">
      ${toggleRow('voice', 'Voice cues', 'The coach talks, counts and encourages', st.voice)}
      ${toggleRow('tempoCount', 'Guided tempo counting', '"Down… up!" and a count for every rep', st.tempoCount)}
      ${toggleRow('warmup', 'Guided warm-up and stretching', '5 warm-up movements at the start, stretches for the muscles you worked at the end', st.warmup !== false)}
      ${toggleRow('captions', 'Captions during workouts', 'What the coach says — a short line that fades out', st.captions !== false)}
      ${toggleRow('music', 'Background music', 'In every workout — music that fits the workout type, quietly under the cues', st.music === true)}
      ${toggleRow('introSound', 'Opening sound', 'A short tune when the app loads', st.introSound !== false)}
      ${toggleRow('usage', 'Usage statistics', 'Which screens and disciplines were used — names only — is sent to help improve the app. Your workouts, weight and nutrition stay on your phone', st.usage !== false)}
      <div style="margin-top:12px"><div class="row between"><b>Volume</b><span class="num sub">${Math.round(st.volume * 100)}%</span></div>
        <input type="range" min="0.2" max="1" step="0.05" value="${st.volume}" data-vol></div>
      <button class="btn sm teal block" style="margin-top:12px" data-test>${icon('play', 'width="16" height="16"')} Test voice</button>
      <div class="voice-dl" data-voice-dl><div class="grow"><b>Voice files on this device</b><div class="sub" data-vdl-status>Checking…</div><div class="bar" style="margin-top:6px"><i data-vdl-bar style="width:0%"></i></div></div>
        <button class="btn sm" data-vdl>${icon('download')} Download</button></div>
    </div>`)}
    ${sec('watch', 'Watch, Garmin and Apple Health', 'Live heart rate, and importing activities and weigh-ins', watchCard())}
    ${sec('profile', 'Profile and goals', `${esc(GOALS[p.goal].name)} · ${p.days} workouts per week`, html`<div class="card">
      <label class="field"><span>The coach addresses you as</span><div class="seg" data-seg="sex">
        <button data-v="m" class="${p.sex !== 'f' ? 'on' : ''}">Male</button><button data-v="f" class="${p.sex === 'f' ? 'on' : ''}">Female</button></div></label>
      <div class="sub" style="font-size:12px;margin:-6px 0 12px">${nameEntry(p) ? `${esc(COACHES[p.coach].name)} has recordings in which ${COACHES[p.coach].f ? 'she calls' : 'he calls'} you "${esc(p.name)}"` : `There is no personal recording yet for the name "${esc(p.name)}" — the coach will address you without a name. Names can be added (tools/names)`}</div>
      <div class="grid2">
        ${field('name', 'Name', p.name, 'text')}${field('age', 'Age', p.age)}
        ${field('heightCm', 'Height (cm)', p.heightCm)}${field('targetWeight', 'Target weight', p.targetWeight)}
      </div>
      <label class="field" ${cali || mob || hiit || pil || yoga || tai || walk ? 'hidden' : ''}><span>Latest 3 km time</span><input class="input num" name="run3k" value="${p.run3k ? fmtTime(p.run3k) : ''}" placeholder="13:30"></label>
      <label class="field"><span>Goal</span><div class="seg" data-seg="goal">${goalsFor(track).map((k) => `<button data-v="${k}" class="${p.goal === k ? 'on' : ''}" aria-label="${GOALS[k].name}">${icon(GOALS[k].icon)}</button>`).join('')}</div>
        <div class="sub" style="font-size:12px;margin-top:4px" data-goal-desc><b>${GOALS[p.goal].name}</b> — ${goalDesc(p.goal, track)}</div></label>
      <label class="field"><span>Workouts per week</span><div class="seg" data-seg="days">${[3, 4, 5, 6].map((v) => `<button data-v="${v}" class="${p.days === v ? 'on' : ''}">${v}</button>`).join('')}</div></label>
      ${mix ? `<label class="field"><span>How many of them are calisthenics? (The rest are in the gym)</span><div class="seg" data-seg="mixCali">${Array.from({ length: p.days - mobN - 1 }, (_, i) => i + 1).map((v) => `<button data-v="${v}" class="${mixCaliCount(p) === v ? 'on' : ''}">${v}${recMix === v ? ' ★' : ''}</button>`).join('')}</div>
        <div class="sub" style="font-size:12px;margin-top:4px">★ Recommended for your goal. After changing the number of workouts per week, save, then choose here again.</div></label>` : ''}
      ${hiit ? `<label class="field"><span>Workout length (minutes)</span><div class="seg" data-seg="hiitMin">${[15, 20, 25].map((v) => `<button data-v="${v}" class="${(p.hiitMin || 20) === v ? 'on' : ''}">${v}</button>`).join('')}</div></label>
      <label class="field"><span>Jumps</span><div class="seg" data-seg="hiitLowN"><button data-v="0" class="${!p.hiitLow ? 'on' : ''}">With jumps</button><button data-v="1" class="${p.hiitLow ? 'on' : ''}">No jumps</button></div></label>` : ''}
      ${pil ? `<label class="field"><span>Class length (minutes)</span><div class="seg" data-seg="pilMin">${[20, 30, 40].map((v) => `<button data-v="${v}" class="${(p.pilMin || 30) === v ? 'on' : ''}">${v}</button>`).join('')}</div></label>
      <label class="field"><span>Level</span><div class="seg" data-seg="level">${[1, 2, 3].map((v) => `<button data-v="${v}" class="${pilLevel(p) === v ? 'on' : ''}">${PIL_LEVELS[v]}</button>`).join('')}</div></label>
      <div class="field"><span>Do any of these apply?</span><div data-pilflags>${flagChips(p.pilFlags || [])}</div>${flagNotes(p.pilFlags || [])}</div>` : ''}
      ${walk ? `<label class="field"><span>Usual walk length (minutes)</span><div class="seg" data-seg="walkMin">${WALK_MINUTES.map((v) => `<button data-v="${v}" class="${(p.walkMin || 30) === v ? 'on' : ''}">${v}</button>`).join('')}</div></label>
      <label class="field"><span>Level</span><div class="seg" data-seg="level">${[1, 2, 3].map((v) => `<button data-v="${v}" class="${walkLevel(p) === v ? 'on' : ''}">${WALK_LEVELS[v]}</button>`).join('')}</div></label>` : ''}
      ${tai ? `<label class="field"><span>Class length (minutes)</span><div class="seg" data-seg="taiMin">${TAI_MINUTES.map((v) => `<button data-v="${v}" class="${(p.taiMin || 20) === v ? 'on' : ''}">${v}</button>`).join('')}</div></label>
      <label class="field"><span>Level</span><div class="seg" data-seg="level">${[1, 2, 3].map((v) => `<button data-v="${v}" class="${taiLevel(p) === v ? 'on' : ''}">${TAI_LEVELS[v]}</button>`).join('')}</div></label>
      <div class="field"><span>Do any of these apply?</span><div data-taiflags>${flagChips(p.taiFlags || [])}</div>${flagNotes(p.taiFlags || [])}</div>` : ''}
      ${yoga ? `<label class="field"><span>Class length (minutes)</span><div class="seg" data-seg="yogaMin">${[20, 30, 45].map((v) => `<button data-v="${v}" class="${(p.yogaMin || 30) === v ? 'on' : ''}">${v}</button>`).join('')}</div></label>
      <label class="field"><span>Level</span><div class="seg" data-seg="level">${[1, 2, 3].map((v) => `<button data-v="${v}" class="${yogaLevel(p) === v ? 'on' : ''}">${YOGA_LEVELS[v]}</button>`).join('')}</div></label>
      <div class="field"><span>Do any of these apply?</span><div data-yogaflags>${flagChips(p.yogaFlags || [])}</div>${flagNotes(p.yogaFlags || [])}</div>` : ''}
      <label class="field" ${mob || run || hiit || pil || yoga || tai || walk ? 'hidden' : ''}><span>Workout duration</span><div class="seg" data-seg="sessionMin">${[45, 60, 75, 90].map((v) => `<button data-v="${v}" class="${p.sessionMin === v ? 'on' : ''}">${v}</button>`).join('')}</div></label>
      <label class="field"><span>Injuries / sensitivities</span><div class="chips">${Object.entries(INJURIES).map(([k, x]) => `<button class="chip no ${p.injuries.includes(k) ? 'on' : ''}" data-inj="${k}">${x.name}</button>`).join('')}</div></label>
      <div class="field" ${noGym ? 'hidden' : ''}><span>How much ${p.sex === 'f' ? 'do you lift' : 'do you lift'} (weight × reps) — optional</span>
        ${Object.entries(ANCHOR_LIFTS).map(([k, name]) => `<div class="lift-row"><span>${name}</span>
          <input class="input num" name="lift_${k}_w" type="number" inputmode="decimal" placeholder="kg" value="${p.lifts?.[k]?.w ?? ''}" aria-label="${name} — weight in kg">
          <i>×</i><input class="input num" name="lift_${k}_r" type="number" inputmode="numeric" placeholder="reps" value="${p.lifts?.[k]?.reps ?? ''}" aria-label="${name} — reps"></div>`).join('')}
        <div class="sub" style="font-size:12px;margin-top:6px">Sets the starting weight for exercises you have not done yet. An exercise that already has history continues from it.</div></div>
      <button class="btn primary block" data-save>Save and update plan</button>
      <div class="sub" style="font-size:12px;margin-top:8px">${pil || yoga || tai || walk ? 'The level goes up after a block in which most classes were completed, and you can change it here' : hiit ? `Current level: ${p.level} — goes up after a block in which most workouts were completed` : run ? 'Each run\'s length is set by the plan and grows from week to week' : mob ? 'Workout length is chosen before each workout: 10, 20 or 30 minutes' : cali ? 'Ladder steps: Plan screen → My ladders' : `Current level${mix ? ' in the gym' : ''}: ${p.level} (${LEVEL_NAMES[p.level]})`} · Changing the goal or days rebuilds the current week.</div>
    </div>`)}

    <a class="card tight set-row" href="#/guide" style="margin-top:12px;text-decoration:none;color:inherit;border-bottom:0"><div class="grow"><b>User guide</b><div class="sub">What to set up and how to train with your coach</div></div><span class="chev">${icon('chev', 'width="20" height="20"')}</span></a>

    ${sec('data', 'Data and backup', 'Backup, restore and reset', html`<div class="card">
      <div class="sub" style="margin-bottom:10px">All data is stored on this device only. A backup saves a file to Files, iCloud or anywhere you choose; the app will remind you once a month.<br><b>${esc(lastBackupText(s))}</b></div>
      <div class="grid2"><button class="btn sm" data-export>${icon('download', 'width="16" height="16"')} Backup</button><label class="btn sm">${icon('upload', 'width="16" height="16"')} Restore<input type="file" accept="application/json" hidden data-import></label></div>
      <button class="btn sm danger block" style="margin-top:10px" data-reset>Full reset</button>
    </div>`)}
    <p class="sub" data-about style="text-align:center;font-size:12px;margin-top:18px">${licenseText() ? `${esc(licenseText())}<br>` : ''}${BRAND.name} · version <span class="num">${APP_VERSION}</span> · updates automatically · characters, demos and voices were created with AI (ElevenLabs)<br>Medical clearance is recommended before starting a training program.</p>`;

  root.querySelectorAll('details[data-sec]').forEach((d) => d.addEventListener('toggle', () => { d.open ? openSec.add(d.dataset.sec) : openSec.delete(d.dataset.sec); }));
  // מצב קובצי הקול במכשיר + הורדה ידנית
  const vdl = (have, total, busy) => {
    const st = root.querySelector('[data-vdl-status]'); if (!st) return;
    const full = have >= total && total > 0;
    st.textContent = busy ? `Downloading… ${have} of ${total}` : full ? `All ${total} files are saved on the device — voice works even with no reception` : `${have} of ${total} saved`;
    root.querySelector('[data-vdl-bar]').style.width = `${total ? Math.round((have / total) * 100) : 0}%`;
    const btn = root.querySelector('[data-vdl]'); btn.disabled = busy; btn.style.display = full && !busy ? 'none' : '';
  };
  // חסרים קבצים (למשל אחרי החלפת מאמן)? מורידים מיד ומציגים התקדמות
  voiceCacheStatus().then(async (s2) => {
    vdl(s2.have, s2.total, false);
    if (s2.have < s2.total && navigator.onLine) { await downloadVoice((d, n) => vdl(d, n, true)); const s3 = await voiceCacheStatus(); vdl(s3.have, s3.total, false); }
  });
  on(root, 'click', '[data-vdl]', async () => {
    if (!navigator.onLine) { toast('No network connection right now'); return; }
    const r = await downloadVoice((d, n) => vdl(d, n, true));
    const s2 = await voiceCacheStatus();
    vdl(s2.have, s2.total, false);
    toast(r.failed ? `${r.failed} files did not download — try again on a good connection` : 'Voice files saved on the device');
  });
  bindWatchCard(root, () => renderCoach(root));
  bindReminders(root, () => renderCoach(root));
  bindMobSettings(root, () => renderCoach(root));
  // טאי צ'י: שאלון הבטיחות נשמר מיד
  root.querySelector('[data-taiflags]')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-flag]'); if (!b) return;
    e.stopPropagation();
    set((s2) => { const fl = (s2.profile.taiFlags ||= []); const i = fl.indexOf(b.dataset.flag); i >= 0 ? fl.splice(i, 1) : fl.push(b.dataset.flag); return regenerateWeek(s2); });
    toast('Classes updated'); renderCoach(root);
  });
  // יוגה: שאלון הבטיחות נשמר מיד
  root.querySelector('[data-yogaflags]')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-flag]'); if (!b) return;
    e.stopPropagation();
    set((s2) => { const fl = (s2.profile.yogaFlags ||= []); const i = fl.indexOf(b.dataset.flag); i >= 0 ? fl.splice(i, 1) : fl.push(b.dataset.flag); return regenerateWeek(s2); });
    toast('Classes updated'); renderCoach(root);
  });
  // פילאטיס: שאלון הבטיחות נשמר מיד (לפני המאזין הכללי של המוביליטי)
  root.querySelector('[data-pilflags]')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-flag]'); if (!b) return;
    e.stopPropagation();
    set((s2) => { const f = (s2.profile.pilFlags ||= []); const i = f.indexOf(b.dataset.flag); i >= 0 ? f.splice(i, 1) : f.push(b.dataset.flag); return regenerateWeek(s2); });
    toast('Classes updated'); renderCoach(root);
  });
  if (sessionStorage.getItem('scrollTo') === 'reminders') { sessionStorage.removeItem('scrollTo'); setTimeout(() => root.querySelector('#reminders')?.scrollIntoView({ behavior: 'smooth' }), 100); }
  on(root, 'click', '[data-th]', (e, b) => { set((s2) => { s2.settings.theme = b.dataset.th; return s2; }); applyTheme(); renderCoach(root); });
  on(root, 'click', '[data-rec-track]', () => recommendSheet(() => renderCoach(root)));
  on(root, 'click', '[data-track]', (e, b) => { if (b.dataset.track !== track) switchTrack(b.dataset.track, () => renderCoach(root)); });
  on(root, 'click', '[data-equip]', (e, b) => {
    const eq = [...get().profile.cali.equip], i = eq.indexOf(b.dataset.equip);
    i >= 0 ? eq.splice(i, 1) : eq.push(b.dataset.equip);
    setEquip(eq); toast('Equipment updated — workouts rebuilt'); renderCoach(root);
  });
  on(root, 'click', '[data-coach]', (e, b) => {
    unlock(); stop();
    set((s2) => { s2.profile.coach = b.dataset.coach; if (!COACHES[b.dataset.coach].track) s2.profile.gymCoach = b.dataset.coach; if (COACHES[b.dataset.coach].track === 'run') s2.profile.runCoach = b.dataset.coach; return isMix(s2.profile) ? regenerateWeek(s2) : s2; });
    say(`hello_${b.dataset.coach}`, { priority: true });
    syncReminders().catch(() => {});
    renderCoach(root);
  });
  on(root, 'click', '[data-lang] button', (e, b) => setLang(b.dataset.v));
  on(root, 'click', '[data-toggle]', (e, b) => { const k = b.dataset.toggle; set((s2) => { s2.settings[k] = !(s2.settings[k] ?? k !== 'music'); return s2; }); document.body.classList.toggle('no-captions', get().settings.captions === false); if (k === 'voice') stop(); renderCoach(root); });
  root.querySelector('[data-vol]').addEventListener('change', (e) => set((s2) => { s2.settings.volume = Number(e.target.value); return s2; }));
  on(root, 'click', '[data-test]', () => { unlock(); say(['mob', 'run', 'hiit', 'pil', 'yoga', 'tai', 'walk'].includes(get().profile.track) ? 'workout_start' : 'm1', { priority: true }); });
  const draft = { goal: p.goal, days: p.days, sessionMin: p.sessionMin, injuries: [...p.injuries], sex: p.sex || 'm', ...(mix ? { mixCali: mixCaliCount(p) } : {}) };
  on(root, 'click', '[data-seg] button', (e, b) => {
    const k = b.closest('[data-seg]').dataset.seg;
    draft[k] = ['goal', 'sex'].includes(k) ? b.dataset.v : Number(b.dataset.v);
    b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    if (k === 'goal') root.querySelector('[data-goal-desc]').innerHTML = `<b>${GOALS[draft.goal].name}</b> — ${goalDesc(draft.goal, track)}`;
  });
  on(root, 'click', '[data-inj]', (e, b) => { const i = draft.injuries.indexOf(b.dataset.inj); i >= 0 ? draft.injuries.splice(i, 1) : draft.injuries.push(b.dataset.inj); b.classList.toggle('on'); });
  on(root, 'click', '[data-save]', () => {
    const val = (n) => root.querySelector(`[name=${n}]`).value.trim();
    const r3 = val('run3k') ? parse3k(val('run3k')) : p.run3k;
    if (val('run3k') && !r3) return toast('Time format: 13:30');
    set((s2) => {
      Object.assign(s2.profile, draft, { name: val('name') || p.name, age: Number(val('age')) || p.age, heightCm: Number(val('heightCm')) || p.heightCm,
        targetWeight: Number(val('targetWeight')) || p.targetWeight, run3k: r3, runLevel: runLevelFrom3k(r3),
        lifts: liftsFrom((k, f) => val(`lift_${k}_${f}`)) });
      if ('hiitLowN' in s2.profile) { s2.profile.hiitLow = !!s2.profile.hiitLowN; delete s2.profile.hiitLowN; }
      if (s2.profile.track === 'mix') s2.profile.mixCali = mixCaliCount(s2.profile); // נשאר לפחות אימון אחד מכל סוג
      s2.plan.completedDays = s2.plan.completedDays.filter((d) => d <= s2.profile.days);
      return regenerateWeek(s2);
    });
    toast('Profile and plan updated');
    syncReminders().catch(() => {});
    renderCoach(root);
  });
  on(root, 'click', '[data-export]', async () => { if (await backupNow()) { toast('Backup saved'); renderCoach(root); } });
  root.querySelector('[data-import]').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { importData(await f.text()); toast('Data restored'); location.hash = '#/home'; } catch (err) { toast(`Error: ${err.message}`); }
  });
  on(root, 'click', '[data-reset]', () => sheet(html`<div class="h1" style="font-size:22px">Delete everything?</div><p class="sub">All workouts, measurements and progress will be permanently deleted.</p>
    <button class="btn danger block" data-yes>Yes, delete everything</button><button class="btn ghost block" style="margin-top:8px" data-close>Cancel</button>`, {
    onMount(sh, c) { sh.querySelector('[data-yes]').addEventListener('click', () => { c(); resetAll(); location.hash = ''; location.reload(); }); },
  }));
}

const toggleRow = (k, t, sub, v) => `<button class="set-row" data-toggle="${k}"><div class="grow"><b>${t}</b><div class="sub">${sub}</div></div><span class="sw ${v ? 'on' : ''}"><i></i></span></button>`;
const field = (n, label, v, type = 'number') => `<label class="field"><span>${label}</span><input class="input ${type === 'number' ? 'num' : ''}" name="${n}" type="${type}" value="${esc(v ?? '')}" ${type === 'number' ? 'inputmode="decimal"' : ''}></label>`;
