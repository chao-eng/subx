/**
 * 翻译风格预设配置
 * 为 AI 字幕翻译注入不同的语气和表达风格
 */
export interface StylePreset {
    id: string
    name: string
    icon: string
    description: string
    prompt: string
}

export const STYLE_PRESETS: StylePreset[] = [
    {
        id: 'default',
        name: '通用标准',
        icon: 'i-lucide-subtitles',
        description: '忠于原文，自然流畅的通用翻译',
        prompt: ''
    },
    {
        id: 'gritty-crime',
        name: '粗犷犯罪 / 废土末日',
        icon: 'i-lucide-skull',
        description: '适用于犯罪剧、黑帮片、末日废土、动作爽片',
        prompt: '请使用粗犷、街头且极具张力的口语化表达。在保留原意的前提下，允许使用符合中文语境的市井俚语和适度的粗口（如：他妈的、卧槽、瘪三、滚蛋）。句子要简短有力，符合底层人物或硬汉的性格，拒绝文绉绉的书面语。'
    },
    {
        id: 'british-spy',
        name: '英伦谍战 / 黑色幽默',
        icon: 'i-lucide-glasses',
        description: '适用于英国军情五处题材、政治惊悚剧、黑色喜剧',
        prompt: '请侧重展现英式英语的冷幽默、讽刺和自嘲。大量使用反语和轻描淡写（Understatement）的修辞手法。语气要显得克制、干瘪、愤世嫉俗但又透着聪明。对于官僚主义的对话，翻译得越敷衍、越阴阳怪气越好。'
    },
    {
        id: 'period-drama',
        name: '历史正剧 / 古典宫廷',
        icon: 'i-lucide-crown',
        description: '适用于中世纪题材、欧洲宫廷剧、维多利亚时代剧集',
        prompt: '请使用典雅、正式且略带古风的中文进行翻译。严格注意对话中的阶级感和尊卑关系，准确使用敬辞和谦辞（如：阁下、大人、陛下、鄙人）。用词要考究，可以适度使用四字成语或半文言文结构，展现历史厚重感。'
    },
    {
        id: 'modern-comedy',
        name: '现代喜剧 / 流行情景',
        icon: 'i-lucide-laugh',
        description: '适用于现代都市剧、情景喜剧、脱口秀',
        prompt: '请使用轻松、活泼、网感强的现代中文口语。如果原文包含双关语或文化梗，请尽量进行意译，替换为中国观众秒懂的流行梗或幽默表达。语气要生动自然，像日常朋友间的吐槽和打闹。'
    },
    {
        id: 'scifi-thriller',
        name: '硬核科幻 / 严肃悬疑',
        icon: 'i-lucide-atom',
        description: '适用于硬科幻、刑侦推理剧、法庭剧',
        prompt: '请保持极其冷静、客观和严谨的基调。对于科学术语、法律条文、医学名词和警方黑话，必须翻译得绝对专业、准确。逻辑连词要清晰，句式偏向理性和书面化，不带任何多余的情感色彩。'
    }
]
