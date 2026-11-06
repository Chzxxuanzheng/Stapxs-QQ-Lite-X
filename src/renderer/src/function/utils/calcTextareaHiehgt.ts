// 参考自 https://github.com/ElemeFE/element/blob/dev/packages/input/src/calcTextareaHeight.js

const HIDDEN_STYLE = `
height:0 !important;
visibility:hidden !important;
overflow:hidden !important;
position:absolute !important;
z-index:-1000 !important;
top:0 !important;
right:0 !important
`

const CONTEXT_STYLE = [
	'letter-spacing',
	'line-height',
	'padding-top',
	'padding-bottom',
	'font-family',
	'font-weight',
	'font-size',
	'text-rendering',
	'text-transform',
	'width',
	'text-indent',
	'padding-left',
	'padding-right',
	'border-width',
	'box-sizing',
]

function calculateNodeStyling(targetElement: HTMLTextAreaElement): {
	contextStyle: string
	paddingSize: number
	borderSize: number
	boxSizing: string
} {
	const style = window.getComputedStyle(targetElement)

	const boxSizing = style.getPropertyValue('box-sizing')

	const paddingSize =
		Number.parseFloat(style.getPropertyValue('padding-bottom')) +
		Number.parseFloat(style.getPropertyValue('padding-top'))

	const borderSize =
		Number.parseFloat(style.getPropertyValue('border-bottom-width')) +
		Number.parseFloat(style.getPropertyValue('border-top-width'))

	const contextStyle = CONTEXT_STYLE.map(
		(name) => `${name}:${style.getPropertyValue(name)}`,
	).join(';')

	return { contextStyle, paddingSize, borderSize, boxSizing }
}

export function calcTextareaHeight(
	targetElement: HTMLTextAreaElement,
	exContent: string = '',
): number {
	const hiddenTextarea = document.createElement('textarea')
	document.body.appendChild(hiddenTextarea)

	const { paddingSize, borderSize, boxSizing, contextStyle } =
		calculateNodeStyling(targetElement)

	hiddenTextarea.setAttribute('style', `${contextStyle};${HIDDEN_STYLE}`)
	hiddenTextarea.value =
		(targetElement.value || targetElement.placeholder || '') + exContent

	let height = hiddenTextarea.scrollHeight

	if (boxSizing === 'border-box') {
		height = height + borderSize
	} else if (boxSizing === 'content-box') {
		height = height - paddingSize
	}

	hiddenTextarea.value = ''

	hiddenTextarea.remove()
	return height
}
