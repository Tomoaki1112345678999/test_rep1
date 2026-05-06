import OpenAI from 'openai'
import { AIMenu, Exercise, Feedback, Machine, Mood, MuscleGroup, Profile } from './types'
import { MACHINES } from '../constants/machines'

interface GenerateMenuParams {
  profile: Profile
  mood: Mood
  enabledMachineIds: string[]
  lastMuscleGroup?: MuscleGroup
  lastFeedback?: Feedback
}

// ローテーション順：上半身A → 下半身 → 上半身B → 有酸素メイン → くり返し
const ROTATION: MuscleGroup[] = ['upper_a', 'lower', 'upper_b', 'cardio']

function nextMuscleGroup(last?: MuscleGroup): MuscleGroup {
  if (!last) return 'lower'
  const idx = ROTATION.indexOf(last)
  return ROTATION[(idx + 1) % ROTATION.length]
}

// 体調・フィードバックによる重量係数
function intensityFactor(mood: Mood, lastFeedback?: Feedback): number {
  let factor = 1.0
  if (mood === 'tired') factor *= 0.85
  if (mood === 'great') factor *= 1.1
  if (lastFeedback === 'easy') factor *= 1.1
  if (lastFeedback === 'hard') factor *= 0.9
  return Math.round(factor * 10) / 10
}

// 初心者向けデフォルト重量（kg）
const DEFAULT_WEIGHT: Record<string, number> = {
  chest_press: 20,
  pec_fly: 15,
  lat_pulldown: 25,
  shoulder_press: 15,
  leg_press: 40,
  leg_curl: 20,
  leg_extension: 20,
  ab_crunch: 0,
}

function buildMockMenu(params: GenerateMenuParams): AIMenu {
  const { profile, mood, enabledMachineIds, lastMuscleGroup, lastFeedback } = params
  const targetGroup = nextMuscleGroup(lastMuscleGroup)
  const factor = intensityFactor(mood, lastFeedback)
  const isBeginner = profile.level === 'beginner'
  const minutes = profile.durationMinutes

  const enabledMachines = MACHINES.filter((m) => enabledMachineIds.includes(m.id))

  // 有酸素マシン
  const cardioMachines = enabledMachines.filter((m) => m.type === 'cardio')
  // 対象筋肉グループの筋トレマシン
  const strengthMachines = enabledMachines.filter(
    (m) => m.type === 'strength' && m.muscleGroup === targetGroup
  )

  const exercises: Exercise[] = []
  let remainMinutes = minutes

  // ウォームアップ有酸素（5〜10分）
  const warmupCardio = cardioMachines[0]
  if (warmupCardio && remainMinutes > 15) {
    const warmupMin = Math.min(10, Math.floor(remainMinutes * 0.25))
    exercises.push({
      machineId: warmupCardio.id,
      machineName: warmupCardio.name,
      type: 'cardio',
      durationMinutes: warmupMin,
      speedKmh: warmupCardio.id === 'treadmill' ? 5.5 : undefined,
      level: warmupCardio.id === 'bike' ? 3 : undefined,
      note: 'ウォームアップ。軽めのペースで体を温める',
    })
    remainMinutes -= warmupMin
  }

  // 筋トレ（残り時間に応じて2〜4種目）
  const setsPerExercise = isBeginner ? 3 : 4
  const repsPerSet = profile.goal === 'diet' ? 15 : 10
  const restSec = isBeginner ? 60 : 90
  const timePerExercise = setsPerExercise * ((repsPerSet * 4) / 60 + restSec / 60)

  const maxExercises = Math.max(1, Math.floor((remainMinutes - 5) / timePerExercise))
  const selectedStrength = strengthMachines.slice(0, maxExercises)

  for (const m of selectedStrength) {
    const baseWeight = DEFAULT_WEIGHT[m.id] ?? 10
    const adjustedWeight = m.id === 'ab_crunch' ? 0 : Math.round(baseWeight * factor / 5) * 5
    exercises.push({
      machineId: m.id,
      machineName: m.name,
      type: 'strength',
      sets: setsPerExercise,
      reps: repsPerSet,
      weightKg: adjustedWeight || undefined,
      restSeconds: restSec,
      note: isBeginner ? 'フォームを意識してゆっくりと' : undefined,
    })
    remainMinutes -= timePerExercise
  }

  // 仕上げ有酸素（残り時間）
  if (remainMinutes >= 5 && cardioMachines.length > 0) {
    const finishCardio = cardioMachines[cardioMachines.length > 1 ? 1 : 0]
    exercises.push({
      machineId: finishCardio.id,
      machineName: finishCardio.name,
      type: 'cardio',
      durationMinutes: Math.floor(remainMinutes),
      level: finishCardio.id === 'bike' ? 4 : undefined,
      speedKmh: finishCardio.id === 'treadmill' ? 6.5 : undefined,
      note: '仕上げ。少し息が上がるペースで',
    })
  }

  const groupLabel: Record<MuscleGroup, string> = {
    upper_a: '上半身A（胸・肩）',
    upper_b: '上半身B（背中・腹）',
    lower: '下半身（脚）',
    cardio: '有酸素メイン',
  }

  const moodLabel: Record<Mood, string> = {
    great: '絶好調なので',
    normal: '今日の体調に合わせて',
    tired: '疲れ気味のため軽めに設定しました',
  }

  return {
    theme: `${groupLabel[targetGroup]} + 有酸素`,
    reason: `${lastMuscleGroup ? `前回は${groupLabel[lastMuscleGroup]}でした。` : ''}${moodLabel[mood]}${targetGroup === 'cardio' ? '今日は有酸素中心でリカバリーします。' : `今日は${groupLabel[targetGroup]}を鍛えます。`}`,
    exercises,
    estimatedMinutes: profile.durationMinutes,
  }
}

async function buildRealMenu(params: GenerateMenuParams, apiKey: string): Promise<AIMenu> {
  const client = new OpenAI({ apiKey })
  const { profile, mood, enabledMachineIds, lastMuscleGroup, lastFeedback } = params

  const enabledMachines = MACHINES.filter((m) => enabledMachineIds.includes(m.id))
  const machineList = enabledMachines.map((m) => `${m.id}: ${m.name}（${m.category}）`).join('\n')

  const groupLabel: Record<MuscleGroup, string> = {
    upper_a: '上半身A（胸・肩）',
    upper_b: '上半身B（背中・腹）',
    lower: '下半身（脚）',
    cardio: '有酸素メイン',
  }

  const systemPrompt = `あなたはパーソナルトレーナーです。ユーザーのチョコザップでのワークアウトメニューをJSON形式で提案してください。
安全で効果的なメニューを、指定されたマシンのみ使用して作成してください。
必ず以下のJSON形式で返してください（他のテキストは不要）:
{
  "theme": "今日のテーマ（例：下半身 + 有酸素）",
  "reason": "このメニューにした理由（1〜2文）",
  "exercises": [
    {
      "machineId": "machine_id",
      "machineName": "マシン名",
      "type": "strength または cardio",
      "sets": 3,
      "reps": 12,
      "weightKg": 20,
      "restSeconds": 60,
      "durationMinutes": null,
      "speedKmh": null,
      "level": null,
      "note": "補足コメント（任意）"
    }
  ],
  "estimatedMinutes": 30
}`

  const userPrompt = `
目的: ${profile.goal}
レベル: ${profile.level}
利用可能時間: ${profile.durationMinutes}分
今日の体調: ${mood}
前回の筋肉グループ: ${lastMuscleGroup ? groupLabel[lastMuscleGroup] : 'なし（初回）'}
前回のフィードバック: ${lastFeedback ?? 'なし'}
利用可能マシン:
${machineList}
`

  const response = await client.chat.completions.create({
    model: 'gpt-5.4-mini-2026-03-17',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('AI response was empty')
  return JSON.parse(content) as AIMenu
}

export async function generateMenu(params: GenerateMenuParams): Promise<AIMenu> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY
  if (!apiKey) {
    // APIキー未設定時はモックで動作
    return buildMockMenu(params)
  }
  try {
    return await buildRealMenu(params, apiKey)
  } catch (e) {
    console.warn('AI API failed, falling back to mock:', e)
    return buildMockMenu(params)
  }
}
