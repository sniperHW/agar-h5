package network

import (
	"unsafe"
)

var powOf2 []int

func UpperBoundOfPowTwo(n int) int {
	for i := 0; i < len(powOf2); i++ {
		if n <= powOf2[i] {
			return powOf2[i]
		}
	}
	return 0
}

func init() {
	var (
		v int
	)
	n := int(unsafe.Sizeof(v))*8 - 1
	powOf2 = make([]int, n)
	for i := 0; i < n; i++ {
		powOf2[i] = 1 << i
	}
}

type MovingAverage struct {
	head    int
	window  []int
	total   int
	wc      int
	average int
}

func (ma *MovingAverage) Add(v int) {
	if ma.wc < len(ma.window) {
		//窗口没有填满
		ma.window[ma.head] = v
		ma.head = (ma.head + 1) % len(ma.window)
		ma.wc++
	} else {
		ma.total -= ma.window[ma.head]
		ma.window[ma.head] = v
		ma.head = (ma.head + 1) % len(ma.window)
	}
	ma.total += v
	ma.average = ma.total / ma.wc
}

func (ma *MovingAverage) Average() int {
	return ma.average
}
