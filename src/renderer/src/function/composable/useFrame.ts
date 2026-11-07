import { onUnmounted } from 'vue'

/**
 * 使用帧循环
 * @param callback
 * @returns 一个停止函数
 */
export function useFrame(callback: () => void): () => void {
	let stopFlag = false
	const loop = () => {
		callback()
		if (stopFlag) return
		requestAnimationFrame(loop)
	}
	requestAnimationFrame(loop)
	onUnmounted((_) => (stopFlag = true))
	return () => (stopFlag = true)
}
