import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, ChevronRight, Clock3, Flame, Layers3, Plus, Sparkles, Trash2, X, Zap } from 'lucide-react-native';

type Category = 'work' | 'life' | 'health' | 'money' | 'growth' | 'quick';
type Step = { id: string; title: string; completed: boolean };
type Task = { id: string; title: string; category: Category; minutes: number; completed: boolean; isFocusHero?: boolean; microSteps: Step[] };

type Theme = { accent: string; soft: string; name: string };
const COLORS: Record<Category, Theme> = {
  work: { accent: '#FF7A59', soft: '#FFF3EE', name: 'Work' },
  life: { accent: '#F43F5E', soft: '#FFF1F2', name: 'Life' },
  health: { accent: '#F59E0B', soft: '#FFFBEB', name: 'Health' },
  money: { accent: '#10B981', soft: '#ECFDF5', name: 'Money' },
  growth: { accent: '#8B5CF6', soft: '#F5F3FF', name: 'Growth' },
  quick: { accent: '#0EA5E9', soft: '#F0F9FF', name: 'Quick' },
};

const INITIAL: Task[] = [
  { id: 'hero', title: 'Draft Product Pitch Deck', category: 'work', minutes: 20, completed: false, isFocusHero: true, microSteps: [
    { id: '1', title: 'Open slide application & pick minimal template', completed: true },
    { id: '2', title: 'Write 1-sentence core problem statement', completed: true },
    { id: '3', title: 'List 3 key feature highlights', completed: false },
    { id: '4', title: 'Add call to action slide', completed: false },
  ] },
  { id: '2', title: 'Reset Workspace & Desk', category: 'life', minutes: 10, completed: false, microSteps: [
    { id: '5', title: 'Clear empty cups & mugs', completed: true },
    { id: '6', title: 'File loose paper notes into drawer', completed: false },
    { id: '7', title: 'Wipe down keyboard & desk mat', completed: false },
  ] },
  { id: '3', title: 'Mindful Morning Stretch', category: 'health', minutes: 8, completed: false, microSteps: [
    { id: '8', title: '2 minutes neck & shoulder rolls', completed: true },
    { id: '9', title: 'Hamstring stretch left & right side', completed: true },
  ] },
  { id: '4', title: 'Quarterly Budget & Savings Goal', category: 'money', minutes: 15, completed: false, microSteps: [
    { id: '10', title: 'Review last month cash flow', completed: true },
    { id: '11', title: 'Set aside 20% into High Yield account', completed: false },
  ] },
  { id: '5', title: 'Read Chapter 4 of Deep Work', category: 'growth', minutes: 15, completed: false, microSteps: [
    { id: '12', title: 'Set 15 minute timer', completed: true },
    { id: '13', title: 'Highlight 3 actionable key takeaways', completed: false },
  ] },
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL);
  const [tab, setTab] = useState('home');
  const [selected, setSelected] = useState<Task | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('work');
  const [toast, setToast] = useState('');
  const progress = useRef(new Animated.Value(0)).current;

  const completed = tasks.filter(t => t.completed).length;
  const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const hero = tasks.find(t => t.isFocusHero && !t.completed) || tasks.find(t => !t.completed) || tasks[0];
  const regular = tasks.filter(t => t.id !== hero?.id);
  const remaining = tasks.filter(t => !t.completed).length;

  useEffect(() => {
    Animated.timing(progress, { toValue: percent, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [percent, progress]);

  const notify = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(''), 2200);
  };

  const toggleStep = (taskId: string, stepId: string) => {
    setTasks(ts => ts.map(t => t.id !== taskId ? t : { ...t, microSteps: t.microSteps.map(s => s.id === stepId ? { ...s, completed: !s.completed } : s) }));
    setSelected(s => s && s.id === taskId ? { ...s, microSteps: s.microSteps.map(x => x.id === stepId ? { ...x, completed: !x.completed } : x) } : s);
  };

  const complete = (task: Task) => {
    if (!task.completed && !task.microSteps.every(s => s.completed)) {
      notify('Finish the micro-steps first to unlock completion ✨');
      return;
    }
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    setSelected(null);
    notify(task.completed ? 'Goal reopened' : 'Goal completed — keep the momentum 🔥');
  };

  const create = () => {
    if (!title.trim()) return;
    const now = Date.now();
    const task: Task = { id: String(now), title: title.trim(), category, minutes: 15, completed: false, microSteps: [
      { id: `${now}a`, title: 'Open workspace & prep materials', completed: false },
      { id: `${now}b`, title: 'Execute the first 5 minutes', completed: false },
      { id: `${now}c`, title: 'Review output and check complete', completed: false },
    ] };
    setTasks(ts => [task, ...ts]);
    setTitle(''); setNewOpen(false);
    notify('Added to your Daily Flow');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={styles.bgBlobOne} />
      <View pointerEvents="none" style={styles.bgBlobTwo} />
      {tab === 'home' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.container}>
            <Header />
            <View style={styles.momentum}>
              <View style={styles.momentumTop}>
                <View style={styles.row}>
                  <View style={styles.zap}><Zap size={14} color="#FF7A59" fill="#FF7A59" /></View>
                  <View><Text style={styles.momentumTitle}>Daily Momentum</Text><Text style={styles.momentumSub}>{remaining === 0 ? 'You cleared the flow' : `${remaining} ${remaining === 1 ? 'goal' : 'goals'} left today`}</Text></View>
                </View>
                <Text style={styles.momentumValue}>{completed}/{tasks.length}</Text>
              </View>
              <View style={styles.track}><Animated.View style={[styles.fill, { width: progress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} /></View>
              <View style={styles.progressFooter}><Text style={styles.progressLabel}>Momentum</Text><Text style={styles.progressPercent}>{percent}%</Text></View>
            </View>

            {hero && <Focus task={hero} open={() => setSelected(hero)} complete={() => complete(hero)} />}

            <View style={styles.section}>
              <View><Text style={styles.sectionTitle}>Woven Flow</Text><Text style={styles.sub}>Small steps. Real momentum.</Text></View>
              <View style={styles.goalPill}><Text style={styles.goalPillText}>{regular.length} goals</Text></View>
            </View>
            {regular.map(task => <Card key={task.id} task={task} open={() => setSelected(task)} complete={() => complete(task)} />)}
            <View style={{ height: 125 }} />
          </View>
        </ScrollView>
      ) : <Placeholder tab={tab} />}

      {tab === 'home' && <Pressable style={({ pressed }) => [styles.fab, pressed && styles.pressed]} onPress={() => setNewOpen(true)}><Plus size={28} color="#fff" strokeWidth={2.7} /></Pressable>}
      <BottomNav tab={tab} setTab={setTab} />
      <TaskModal task={selected} close={() => setSelected(null)} toggle={toggleStep} complete={complete} remove={id => { setTasks(ts => ts.filter(t => t.id !== id)); setSelected(null); notify('Goal removed'); }} />
      <NewGoalModal visible={newOpen} title={title} setTitle={setTitle} category={category} setCategory={setCategory} close={() => setNewOpen(false)} create={create} />
      {toast ? <View style={styles.toast}><View style={styles.toastIcon}><Sparkles size={14} color="#FF7A59" /></View><Text style={styles.toastText}>{toast}</Text></View> : null}
    </SafeAreaView>
  );
}

function Header() {
  return <View style={styles.header}>
    <View style={styles.brandRow}><View style={styles.logo}><Text style={styles.logoText}>W</Text></View><View><Text style={styles.brand}>Weave</Text><Text style={styles.tagline}>Minimalist Daily Flow</Text></View></View>
    <View style={styles.flow}><View style={styles.dot} /><Text style={styles.flowText}>Flow State</Text></View>
  </View>;
}

function Focus({ task, open, complete }: { task: Task; open: () => void; complete: () => void }) {
  const c = COLORS[task.category];
  const done = task.microSteps.filter(s => s.completed).length;
  return <View style={styles.focus}>
    <View style={styles.focusHead}><View style={styles.row}><View style={styles.flame}><Flame size={13} color="#D97706" fill="#D97706" /></View><Text style={styles.focusLabel}>CURRENT FOCUS</Text></View><Text style={styles.focusHint}>1 goal at a time</Text></View>
    <Pressable onPress={open} style={({ pressed }) => [styles.hero, pressed && styles.heroPressed]}>
      <View style={styles.heroGlow} />
      <View style={styles.heroTop}><View style={[styles.badge, { backgroundColor: `${c.accent}1C`, borderColor: `${c.accent}45` }]}><View style={[styles.badgeDot, { backgroundColor: c.accent }]} /><Text style={[styles.badgeText, { color: c.accent }]}>{c.name.toUpperCase()} · {task.minutes} MIN</Text></View><View style={styles.micro}><Layers3 size={12} color="#D4D4D8" /><Text style={styles.microText}>{done}/{task.microSteps.length}</Text><ChevronRight size={13} color="#A1A1AA" /></View></View>
      <Text style={styles.heroTitle}>{task.title}</Text>
      <View style={styles.steps}>{task.microSteps.map(step => <View key={step.id} style={styles.step}><View style={[styles.circle, step.completed && styles.circleDone]}>{step.completed && <Check size={10} color="#fff" strokeWidth={3} />}</View><Text numberOfLines={1} style={[styles.stepText, step.completed && styles.strike]}>{step.title}</Text></View>)}</View>
      <View style={styles.heroFoot}><View><Text style={styles.guard}>ADHD GUARDRAIL</Text><Text style={styles.guardSub}>Complete every small step</Text></View><Pressable onPress={e => { e.stopPropagation(); complete(); }} style={({ pressed }) => [styles.complete, task.microSteps.every(s => s.completed) && styles.ready, pressed && styles.pressed]}><Check size={14} color="#fff" strokeWidth={3} /><Text style={styles.completeText}>{task.completed ? 'Done' : 'Complete'}</Text></Pressable></View>
    </Pressable>
  </View>;
}

function Card({ task, open, complete }: { task: Task; open: () => void; complete: () => void }) {
  const c = COLORS[task.category];
  const done = task.microSteps.filter(s => s.completed).length;
  const stepProgress = task.microSteps.length ? done / task.microSteps.length : 0;
  return <Pressable onPress={open} style={({ pressed }) => [styles.card, { backgroundColor: c.soft, borderColor: `${c.accent}2D` }, pressed && styles.cardPressed]}>
    <View style={[styles.accent, { backgroundColor: c.accent }]} /><View style={styles.cardBody}>
      <View style={styles.rowBetween}><View style={[styles.category, { backgroundColor: `${c.accent}18` }]}><View style={[styles.categoryDot, { backgroundColor: c.accent }]} /><Text style={[styles.categoryText, { color: c.accent }]}>{c.name}</Text></View><View style={styles.time}><Clock3 size={12} color="#71717A" /><Text style={styles.timeText}>{task.minutes}m</Text></View></View>
      <Text style={[styles.cardTitle, task.completed && styles.strike]}>{task.title}</Text>
      <View style={styles.cardBottom}><View style={styles.miniProgress}><View style={[styles.miniFill, { width: `${stepProgress * 100}%`, backgroundColor: c.accent }]} /></View><Text style={styles.stepSummary}>{done}/{task.microSteps.length}</Text><Pressable onPress={e => { e.stopPropagation(); complete(); }} style={({ pressed }) => [styles.smallCheck, task.completed && styles.smallDone, pressed && styles.pressed]}><Check size={14} color={task.completed ? '#fff' : '#71717A'} strokeWidth={3} /></Pressable></View>
    </View>
  </Pressable>;
}

function BottomNav({ tab, setTab }: { tab: string; setTab: (x: string) => void }) {
  const items = [['home', 'Home', Sparkles], ['flow', 'Flow', Zap], ['voice', 'Voice', Layers3], ['pro', 'Pro', Flame]] as const;
  return <View style={styles.navWrap}><View style={styles.nav}>{items.map(([id, label, Icon]) => <Pressable key={id} onPress={() => setTab(id)} style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}><View style={[styles.navIcon, tab === id && styles.navIconActive]}><Icon size={18} color={tab === id ? '#FF7A59' : '#71717A'} strokeWidth={tab === id ? 2.4 : 2} /></View><Text style={[styles.navText, tab === id && styles.navActive]}>{label}</Text></Pressable>)}</View></View>;
}

function Placeholder({ tab }: { tab: string }) {
  const data: Record<string, [string, string, typeof Sparkles]> = { flow: ['Flow', 'Your momentum insights will live here.', Zap], voice: ['Voice', 'Turn a brain dump into your next small step.', Layers3], pro: ['Weave Pro', 'A calmer, smarter way to go deeper.', Flame] };
  const [title, sub, Icon] = data[tab] || data.flow;
  return <View style={styles.placeholder}><View style={styles.placeholderIcon}><Icon size={30} color="#FF7A59" /></View><Text style={styles.placeholderTitle}>{title}</Text><Text style={styles.placeholderText}>{sub}</Text><View style={styles.coming}><Text style={styles.comingText}>COMING NEXT</Text></View></View>;
}

function TaskModal({ task, close, toggle, complete, remove }: { task: Task | null; close: () => void; toggle: (a: string, b: string) => void; complete: (t: Task) => void; remove: (id: string) => void }) {
  if (!task) return null;
  const c = COLORS[task.category];
  const done = task.microSteps.filter(s => s.completed).length;
  return <Modal visible transparent animationType="slide" onRequestClose={close}><View style={styles.backdrop}><View style={styles.detail}>
    <View style={styles.grabber} /><View style={styles.sheetHead}><View style={{ flex: 1, paddingRight: 16 }}><Text style={[styles.eyebrow, { color: c.accent }]}>{c.name} · {task.minutes} MINUTES</Text><Text style={styles.detailTitle}>{task.title}</Text></View><Pressable onPress={close} style={styles.close}><X size={20} color="#52525B" /></Pressable></View>
    <View style={styles.detailProgress}><View style={styles.detailProgressTrack}><View style={[styles.detailProgressFill, { width: `${task.microSteps.length ? done / task.microSteps.length * 100 : 0}%`, backgroundColor: c.accent }]} /></View><Text style={styles.detailProgressText}>{done} of {task.microSteps.length} complete</Text></View>
    <Text style={styles.detailHint}>Break the goal down. Finish the small things. Then unlock completion.</Text>
    {task.microSteps.map(step => <Pressable key={step.id} onPress={() => toggle(task.id, step.id)} style={({ pressed }) => [styles.detailStep, pressed && styles.detailPressed]}><View style={[styles.detailCheck, step.completed && { backgroundColor: c.accent, borderColor: c.accent }]}>{step.completed && <Check size={12} color="#fff" strokeWidth={3} />}</View><Text style={[styles.detailText, step.completed && styles.strike]}>{step.title}</Text></Pressable>)}
    <View style={styles.actions}><Pressable onPress={() => complete(task)} style={styles.detailComplete}><Check size={17} color="#fff" strokeWidth={3} /><Text style={styles.detailCompleteText}>{task.completed ? 'Reopen Goal' : 'Mark Complete'}</Text></Pressable><Pressable onPress={() => remove(task.id)} style={styles.delete}><Trash2 size={17} color="#EF4444" /></Pressable></View>
  </View></View></Modal>;
}

function NewGoalModal({ visible, title, setTitle, category, setCategory, close, create }: { visible: boolean; title: string; setTitle: (x: string) => void; category: Category; setCategory: (x: Category) => void; close: () => void; create: () => void }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}><KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.sheet}><View style={styles.grabber} /><View style={styles.sheetHead}><View><Text style={styles.sheetKicker}>DAILY FLOW</Text><Text style={styles.sheetTitle}>New Goal</Text></View><Pressable onPress={close} style={styles.close}><X size={20} color="#52525B" /></Pressable></View><Text style={styles.label}>What do you want to move forward?</Text><TextInput value={title} onChangeText={setTitle} placeholder="e.g. Finish landing page" placeholderTextColor="#A1A1AA" style={styles.input} autoFocus /><Text style={styles.label}>Category</Text><View style={styles.chips}>{(Object.keys(COLORS) as Category[]).map(c => <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, { backgroundColor: category === c ? COLORS[c].soft : '#F7F7F8', borderColor: category === c ? COLORS[c].accent : '#E4E4E7' }]}><View style={[styles.chipDot, { backgroundColor: COLORS[c].accent }]} /><Text style={{ fontSize: 10, fontWeight: '800', color: category === c ? COLORS[c].accent : '#71717A' }}>{COLORS[c].name}</Text></Pressable>)}</View><Pressable disabled={!title.trim()} onPress={create} style={({ pressed }) => [styles.create, !title.trim() && styles.disabled, pressed && styles.pressed]}><Plus size={18} color="#fff" strokeWidth={2.5} /><Text style={styles.createText}>Add to Daily Flow</Text></Pressable></View></KeyboardAvoidingView></Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF9F5' }, scroll: { paddingBottom: 12 }, container: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 17, paddingTop: 10 },
  bgBlobOne: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: '#FFE7DE', opacity: 0.42, top: -110, right: -80 }, bgBlobTwo: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#EEE7FA', opacity: 0.35, top: 360, left: -130 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 }, rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 19 }, brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 }, logo: { width: 43, height: 43, borderRadius: 15, backgroundColor: '#FF7A59', alignItems: 'center', justifyContent: 'center', shadowColor: '#FF7A59', shadowOpacity: 0.22, shadowRadius: 10, elevation: 4 }, logoText: { color: '#fff', fontSize: 20, fontWeight: '900' }, brand: { fontSize: 19, lineHeight: 20, fontWeight: '900', color: '#18181B', letterSpacing: -0.4 }, tagline: { fontSize: 10.5, color: '#A1A1AA', marginTop: 3, fontWeight: '600' }, flow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' }, flowText: { color: '#047857', fontSize: 9.5, fontWeight: '800' },
  momentum: { backgroundColor: 'rgba(255,255,255,0.84)', borderRadius: 24, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', shadowColor: '#18181B', shadowOpacity: 0.055, shadowRadius: 18, elevation: 2, marginBottom: 22 }, momentumTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }, momentumTitle: { fontSize: 12, fontWeight: '900', color: '#27272A' }, momentumSub: { fontSize: 9.5, color: '#A1A1AA', marginTop: 2, fontWeight: '600' }, zap: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#FFF0EB', alignItems: 'center', justifyContent: 'center' }, momentumValue: { color: '#FF7A59', fontSize: 14, fontWeight: '900' }, track: { width: '100%', backgroundColor: '#F0F0F1', height: 7, borderRadius: 99, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 99, backgroundColor: '#FF7A59' }, progressFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }, progressLabel: { fontSize: 9, color: '#A1A1AA', fontWeight: '700' }, progressPercent: { fontSize: 9, color: '#71717A', fontWeight: '800' },
  focus: { marginBottom: 27 }, focusHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2, marginBottom: 9 }, flame: { width: 22, height: 22, borderRadius: 7, backgroundColor: '#FFF7E6', alignItems: 'center', justifyContent: 'center' }, focusLabel: { fontSize: 10, fontWeight: '900', color: '#B45309', letterSpacing: 1.05 }, focusHint: { fontSize: 9.5, fontWeight: '700', color: '#A1A1AA' },
  hero: { overflow: 'hidden', backgroundColor: '#18181B', borderRadius: 30, padding: 20, shadowColor: '#18181B', shadowOpacity: 0.25, shadowRadius: 22, elevation: 7, borderWidth: 1, borderColor: '#2A2A2D' }, heroPressed: { transform: [{ scale: 0.988 }] }, heroGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: '#FF7A59', opacity: 0.10, right: -60, top: -75 }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }, badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 }, badgeDot: { width: 5, height: 5, borderRadius: 3 }, badgeText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 0.65 }, micro: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14 }, microText: { color: '#D4D4D8', fontSize: 9, fontWeight: '800' }, heroTitle: { color: '#fff', fontSize: 21, lineHeight: 26, fontWeight: '800', letterSpacing: -0.45, marginBottom: 16 }, steps: { gap: 9, marginBottom: 17 }, step: { flexDirection: 'row', alignItems: 'center', gap: 9 }, circle: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.2, borderColor: '#52525B', alignItems: 'center', justifyContent: 'center' }, circleDone: { backgroundColor: '#10B981', borderColor: '#10B981' }, stepText: { flex: 1, color: '#D4D4D8', fontSize: 10.5, fontWeight: '600' }, strike: { textDecorationLine: 'line-through', color: '#71717A' }, heroFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTopWidth: 1, borderTopColor: '#2D2D30' }, guard: { color: '#A1A1AA', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.7 }, guardSub: { color: '#52525B', fontSize: 8.5, marginTop: 3, fontWeight: '600' }, complete: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#29292C', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: '#3F3F46' }, ready: { backgroundColor: '#FF7A59', borderColor: '#FF7A59' }, completeText: { color: '#fff', fontSize: 9.5, fontWeight: '900' },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 11, paddingHorizontal: 2 }, sectionTitle: { color: '#18181B', fontSize: 17, fontWeight: '900', letterSpacing: -0.3 }, sub: { color: '#A1A1AA', fontSize: 9.5, fontWeight: '600', marginTop: 2 }, goalPill: { backgroundColor: '#F4F4F5', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 }, goalPillText: { color: '#71717A', fontSize: 9, fontWeight: '800' },
  card: { flexDirection: 'row', minHeight: 101, borderRadius: 22, borderWidth: 1, marginBottom: 10, overflow: 'hidden', shadowColor: '#18181B', shadowOpacity: 0.035, shadowRadius: 10, elevation: 1 }, cardPressed: { transform: [{ scale: 0.988 }], opacity: 0.94 }, accent: { width: 4 }, cardBody: { flex: 1, padding: 14 }, category: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 10 }, categoryDot: { width: 5, height: 5, borderRadius: 3 }, categoryText: { fontSize: 8.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }, time: { flexDirection: 'row', alignItems: 'center', gap: 4 }, timeText: { color: '#71717A', fontSize: 9.5, fontWeight: '700' }, cardTitle: { color: '#27272A', fontSize: 13.5, fontWeight: '800', marginTop: 10, marginBottom: 12, letterSpacing: -0.15 }, cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 7 }, miniProgress: { flex: 1, height: 4, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }, miniFill: { height: '100%', borderRadius: 99 }, stepSummary: { color: '#A1A1AA', fontSize: 8.5, fontWeight: '800', minWidth: 20 }, smallCheck: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#D4D4D8', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.55)' }, smallDone: { backgroundColor: '#10B981', borderColor: '#10B981' },
  fab: { position: 'absolute', right: 19, bottom: 92, width: 57, height: 57, borderRadius: 29, backgroundColor: '#FF7A59', alignItems: 'center', justifyContent: 'center', shadowColor: '#FF7A59', shadowOpacity: 0.32, shadowRadius: 13, elevation: 8, borderWidth: 3, borderColor: '#FFF9F5' }, navWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 13, paddingBottom: Platform.OS === 'ios' ? 5 : 8, paddingTop: 8, backgroundColor: 'rgba(255,249,245,0.94)', borderTopWidth: 1, borderTopColor: 'rgba(228,228,231,0.7)' }, nav: { maxWidth: 520, width: '100%', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-around' }, navItem: { alignItems: 'center', minWidth: 64, paddingVertical: 3 }, navIcon: { width: 38, height: 26, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, navIconActive: { backgroundColor: '#FFF0EB' }, navText: { color: '#71717A', fontSize: 8.5, fontWeight: '800', marginTop: 2 }, navActive: { color: '#FF7A59' },
  backdrop: { flex: 1, backgroundColor: 'rgba(24,24,27,0.42)', justifyContent: 'flex-end' }, sheet: { backgroundColor: '#FFFDFC', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 19, paddingTop: 9, paddingBottom: Platform.OS === 'ios' ? 32 : 22, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 25, elevation: 15 }, detail: { backgroundColor: '#FFFDFC', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 19, paddingTop: 9, paddingBottom: Platform.OS === 'ios' ? 30 : 20, maxHeight: '88%', shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 25, elevation: 15 }, grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 3, backgroundColor: '#D4D4D8', marginBottom: 17 }, sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }, sheetKicker: { fontSize: 8.5, fontWeight: '900', color: '#A1A1AA', letterSpacing: 1.2, marginBottom: 4 }, sheetTitle: { fontSize: 25, fontWeight: '900', color: '#18181B', letterSpacing: -0.7 }, close: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F4F4F5', alignItems: 'center', justifyContent: 'center' }, label: { color: '#52525B', fontSize: 10, fontWeight: '800', marginBottom: 8, marginTop: 2 }, input: { height: 51, borderWidth: 1, borderColor: '#E4E4E7', borderRadius: 16, backgroundColor: '#FAFAFA', paddingHorizontal: 14, color: '#18181B', fontSize: 14, fontWeight: '600', marginBottom: 16 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 19 }, chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 13, paddingHorizontal: 9, paddingVertical: 7 }, chipDot: { width: 6, height: 6, borderRadius: 3 }, create: { height: 50, borderRadius: 17, backgroundColor: '#FF7A59', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, shadowColor: '#FF7A59', shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 }, createText: { color: '#fff', fontSize: 12, fontWeight: '900' }, disabled: { backgroundColor: '#D4D4D8', shadowOpacity: 0 }, detailProgress: { marginBottom: 14 }, detailProgressTrack: { height: 5, borderRadius: 99, backgroundColor: '#F0F0F1', overflow: 'hidden' }, detailProgressFill: { height: '100%', borderRadius: 99 }, detailProgressText: { fontSize: 8.5, color: '#A1A1AA', fontWeight: '700', marginTop: 5 }, detailHint: { color: '#71717A', fontSize: 10, lineHeight: 15, fontWeight: '600', marginBottom: 14 }, eyebrow: { fontSize: 8.5, fontWeight: '900', letterSpacing: 1, marginBottom: 4 }, detailTitle: { color: '#18181B', fontSize: 21, lineHeight: 25, fontWeight: '900', letterSpacing: -0.5 }, detailStep: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: '#F4F4F5' }, detailPressed: { opacity: 0.7 }, detailCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#D4D4D8', alignItems: 'center', justifyContent: 'center' }, detailText: { flex: 1, color: '#3F3F46', fontSize: 11.5, lineHeight: 17, fontWeight: '650' }, actions: { flexDirection: 'row', gap: 9, marginTop: 18 }, detailComplete: { flex: 1, height: 48, borderRadius: 16, backgroundColor: '#FF7A59', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, detailCompleteText: { color: '#fff', fontSize: 11, fontWeight: '900' }, delete: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', left: 18, right: 18, bottom: 82, backgroundColor: '#18181B', borderRadius: 17, minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 }, toastIcon: { width: 27, height: 27, borderRadius: 9, backgroundColor: '#2A2A2D', alignItems: 'center', justifyContent: 'center' }, toastText: { flex: 1, color: '#F4F4F5', fontSize: 10.5, fontWeight: '700' }, placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }, placeholderIcon: { width: 70, height: 70, borderRadius: 24, backgroundColor: '#FFF0EB', alignItems: 'center', justifyContent: 'center', marginBottom: 17 }, placeholderTitle: { color: '#18181B', fontSize: 24, fontWeight: '900', letterSpacing: -0.6 }, placeholderText: { color: '#71717A', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8, fontWeight: '600' }, coming: { marginTop: 17, backgroundColor: '#F4F4F5', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 }, comingText: { color: '#A1A1AA', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 }, pressed: { opacity: 0.82 },
});
