import type {
	Blockquote,
	Break,
	Code,
	Delete,
	Emphasis,
	Heading,
	Image,
	InlineCode,
	Link,
	List,
	Paragraph,
	RootContent,
	Strong,
	Table,
	Text,
	ThematicBreak,
} from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import type { Options } from 'mdast-util-from-markdown'
import { gfmStrikethroughFromMarkdown } from 'mdast-util-gfm-strikethrough'
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table'
import { gfmStrikethrough } from 'micromark-extension-gfm-strikethrough'
import { gfmTable } from 'micromark-extension-gfm-table'
import type {
	BlockquoteSegData,
	BreakSegData,
	CodeSegData,
	DeleteSegData,
	EmphasisSegData,
	HeadingSegData,
	ImgSegData,
	InlineCodeSegData,
	LinkSegData,
	ListSegData,
	SegData,
	StrongSegData,
	TableSegData,
	TextSegData,
	ThematicBreakSegData,
} from '@renderer/function/adapter/interface'
import { Resource } from '@renderer/function/model/resource'

const mdastOptions: Options = {
	extensions: [gfmTable(), gfmStrikethrough({ singleTilde: false })],
	mdastExtensions: [gfmTableFromMarkdown(), gfmStrikethroughFromMarkdown()],
}

export type MdParser = {
	bivarianceHack(node: RootContent, parser: Parser): Promise<SegData[]>
}['bivarianceHack']

export interface MdParserMap {
	[type: string]: MdParser | undefined
	blockquote?(node: Blockquote, parser: Parser): Promise<SegData[]>
	break?(node: Break, parser: Parser): Promise<SegData[]>
	code?(node: Code, parser: Parser): Promise<SegData[]>
	delete?(node: Delete, parser: Parser): Promise<SegData[]>
	emphasis?(node: Emphasis, parser: Parser): Promise<SegData[]>
	heading?(node: Heading, parser: Parser): Promise<SegData[]>
	image?(node: Image, parser: Parser): Promise<SegData[]>
	inlineCode?(node: InlineCode, parser: Parser): Promise<SegData[]>
	link?(node: Link, parser: Parser): Promise<SegData[]>
	list?(node: List, parser: Parser): Promise<SegData[]>
	paragraph?(node: Paragraph, parser: Parser): Promise<SegData[]>
	strong?(node: Strong, parser: Parser): Promise<SegData[]>
	table?(node: Table, parser: Parser): Promise<SegData[]>
	text?(node: Text, parser: Parser): Promise<SegData[]>
	thematicBreak?(node: ThematicBreak, parser: Parser): Promise<SegData[]>
	unknown?(node: RootContent, parser: Parser): Promise<SegData[]>
}

class Parser {
	private source: string | undefined

	constructor(private readonly parserMap: MdParserMap) {}

	async parse(content: string): Promise<SegData[]> {
		this.source = content
		const root = fromMarkdown(content, mdastOptions)
		const out = await this.convert(root.children ?? [])

		// 去掉首尾多余的换行
		while (out.length > 0 && out[out.length - 1].type === 'break') out.pop()
		while (out.length > 0 && out[0].type === 'break') out.shift()

		return out
	}

	/**
	 * 转换节点列表到指定输出数组
	 */
	async convert(nodes: RootContent[]): Promise<SegData[]> {
		const out: SegData[] = []
		for (const node of nodes) {
			const parser =
				this.parserMap[node.type] ?? this.parserMap['unknown']!
			out.push(...(await parser(node, this)))
		}
		return out
	}

	/**
	 * 取节点对应的原始 markdown 文本
	 */
	getRaw(node: RootContent): string | undefined {
		if (!this.source) return undefined
		const start = node.position?.start.offset
		const end = node.position?.end.offset
		if (start === undefined || end === undefined) return undefined
		return this.source.slice(start, end)
	}

	getPlaintext(nodes: RootContent[]): string {
		return nodes
			.map((node) => {
				switch (node.type) {
					case 'text':
					case 'inlineCode':
					case 'html':
						return node.value ?? ''
					case 'break':
						return ' '
					case 'image':
						return node.alt ?? ''
					default:
						return 'children' in node
							? this.getPlaintext(node.children)
							: ''
				}
			})
			.join('')
	}
}

/**
 * 转换文本节点
 */
function convertText(value: string): SegData[] {
	const out: SegData[] = []
	const lines = value.split(/\r\n?|\n/)
	for (let i = 0; i < lines.length; i++) {
		if (i > 0) out.push({ type: 'break' } as BreakSegData)
		if (lines[i]) out.push({ type: 'text', text: lines[i] } as TextSegData)
	}
	return out
}

export const defaultMdParser = {
	text: async (node: Text) => convertText(node.value ?? ''),
	break: async () => [{ type: 'break' } as BreakSegData],
	inlineCode: async (node: InlineCode) => [
		{
			type: 'inline-code',
			content: node.value ?? '',
		} as InlineCodeSegData,
	],
	strong: async (node: Strong, parser: Parser) => [
		{
			type: 'strong',
			children: await parser.convert(node.children ?? []),
		} as StrongSegData,
	],
	emphasis: async (node: Emphasis, parser: Parser) => [
		{
			type: 'emphasis',
			children: await parser.convert(node.children ?? []),
		} as EmphasisSegData,
	],
	delete: async (node: Delete, parser: Parser) => [
		{
			type: 'delete',
			children: await parser.convert(node.children ?? []),
		} as DeleteSegData,
	],
	link: async (node: Link, parser: Parser) => {
		const url = node.url ?? ''
		const name = parser.getPlaintext(node.children ?? []).trim()
		return [{ type: 'link', url, name: name || url } as LinkSegData]
	},
	image: async (node: Image) => {
		const url = node.url ?? ''
		const seg: ImgSegData = {
			type: 'image',
			url: Resource.fromUrl(url),
			isFace: false,
		}
		if (node.alt) seg.summary = node.alt
		return [seg as ImgSegData]
	},
	code: async (node: Code) => [
		{
			type: 'code',
			content: node.value ?? '',
			lang: node.lang ?? '',
		} as CodeSegData,
	],
	heading: async (node: Heading, parser: Parser) => {
		const level = Math.min(
			6,
			Math.max(1, node.depth ?? 1),
		) as HeadingSegData['level']
		return [
			{
				type: 'heading',
				level,
				children: await parser.convert(node.children ?? []),
			} as HeadingSegData,
		]
	},
	thematicBreak: async () => [
		{ type: 'thematic-break' } as ThematicBreakSegData,
	],
	blockquote: async (node: Blockquote, parser: Parser) => [
		{
			type: 'blockquote',
			children: await parser.convert(node.children ?? []),
		} as BlockquoteSegData,
	],
	list: async (node: List, parser: Parser) => [
		{
			type: 'list',
			ordered: node.ordered === true,
			children: await Promise.all(
				(node.children ?? []).map((item) =>
					parser.convert(item.children ?? []),
				),
			),
		} as ListSegData,
	],
	table: async (node: Table, parser: Parser) => {
		const rows = node.children ?? []
		const head = await Promise.all(
			(rows[0]?.children ?? []).map((cell) =>
				parser.convert(cell.children ?? []),
			),
		)
		const content = await Promise.all(
			rows
				.slice(1)
				.map((row) =>
					Promise.all(
						(row.children ?? []).map((cell) =>
							parser.convert(cell.children ?? []),
						),
					),
				),
		)
		return [{ type: 'table', head, content } as TableSegData]
	},
	paragraph: async (node: Paragraph, parser: Parser) =>
		parser.convert(node.children ?? []),
	unknown: async (node, parser) => {
		const raw = parser.getRaw(node)
		if (raw !== undefined) return convertText(raw)
		if ('value' in node && node.value)
			return [{ type: 'text', text: node.value } as TextSegData]
		if ('children' in node) return parser.convert(node.children)
		return []
	},
} satisfies MdParserMap

/**
 * Markdown -> 消息段
 * @param content markdown 内容
 */
export async function parseMarkdown(
	content: string,
	customParser?: MdParserMap,
): Promise<SegData[]> {
	const mdParser: MdParserMap = { ...defaultMdParser }
	for (const key in customParser) {
		mdParser[key] = customParser[key]
	}
	return await new Parser(mdParser).parse(content)
}
