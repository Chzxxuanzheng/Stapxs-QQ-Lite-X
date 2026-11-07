/*
 * @FileDescription: 图片节点
 * @Author: Mr.Lee
 * @Date: 2025/08/23
 * @Version: 1.0
 * @Description: 图片节点，主用给图片预览器使用
 */

import { shallowRef } from 'vue'
import { Resource } from '@renderer/function/model/resource'

export class Img {
	_src: Resource
	readonly _prev = shallowRef<Img | undefined>()
	readonly _next = shallowRef<Img | undefined>()
	constructor(src: string | Resource) {
		if (typeof src === 'string') this._src = Resource.fromUrl(src)
		else this._src = src
	}

	get src(): string {
		return this._src.url
	}

	/**
	 * 删除图片
	 */
	delete() {
		if (this.prev) this.prev.next = this.next
		if (this.next) this.next.prev = this.prev
	}

	/**
	 * 尾部添加图片
	 * @param other 其他图片
	 */
	insertNext(other: Img) {
		other.prev = this
		other.next = this.next
		this.next = other
	}
	/**
	 * 头部添加图片
	 * @param other 其他图片
	 */
	insertPrev(other: Img) {
		other.prev = this.prev
		other.next = this
		this.prev = other
	}

	/**
	 * 向后合并图片列表
	 * @param otherHead 其他图片列表
	 */
	concatNext(otherHead: Img) {
		if (otherHead.prev)
			throw new Error(
				'otherHead.prev 不为空，不能合并，请使用 extendNext',
			)
		if (this.next)
			throw new Error('this.next 不为空，不能合并，请使用 extendNext')
		this.next = otherHead
		otherHead.prev = this
	}
	/**
	 * 向前合并图片列表
	 * @param otherTail 其他图片列表
	 */
	concatPrev(otherTail: Img) {
		if (otherTail.next)
			throw new Error(
				'otherTail.next 不为空，不能合并，请使用 extendPrev',
			)
		if (this.prev)
			throw new Error('this.prev 不为空，不能合并，请使用 extendPrev')
		this.prev = otherTail
		otherTail.next = this
	}

	/**
	 * 向后插入图片列表
	 * @param other 其他图片列表
	 */
	extendNext(other: Img) {
		const next = other.next
		this.insertNext(other)
		if (next) other.extendNext(next)
	}
	/**
	 * 向前插入图片列表
	 * @param other 其他图片列表
	 */
	extendPrev(other: Img) {
		const prev = other.prev
		this.insertPrev(other)
		if (prev) other.extendPrev(prev)
	}

	get prev() {
		return this._prev.value
	}

	get next() {
		return this._next.value
	}

	set prev(img: Img | undefined) {
		this._prev.value = img
	}

	set next(img: Img | undefined) {
		this._next.value = img
	}
}
