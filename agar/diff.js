/*
有序数组的集合比较
*/
function diff(arrayA,arrayAIdx,arrayB,arrayBIdx,enter,leave,unchage) {
	if(arrayA.length <= arrayAIdx) {
		for(var i = arrayBIdx;i < arrayB.length; i++){
			enter[enter.length] = arrayB[i];
		}
		return;
	}

	if(arrayB.length <= arrayBIdx) {
		for(var i = arrayAIdx; i < arrayA.length; i++){
			leave[leave.length] = arrayA[i];
		}
		return;
	}

	if(arrayA[arrayAIdx] == arrayB[arrayBIdx]) {
		unchage[unchage.length] = arrayA[arrayAIdx];
		return diff(arrayA,arrayAIdx+1,arrayB,arrayBIdx+1,enter,leave,unchage);
	} else {
		//寻找下一个匹配点
		if(arrayA[arrayAIdx] < arrayB[arrayBIdx]) {
			leave[leave.length] = arrayA[arrayAIdx];
			return diff(arrayA,arrayAIdx+1,arrayB,arrayBIdx,enter,leave,unchage);
		} else {
			enter[enter.length] = arrayB[arrayBIdx];
			return diff(arrayA,arrayAIdx,arrayB,arrayBIdx+1,enter,leave,unchage);
		}
	}
}


var enter = [];
var leave = [];
var unchage = [];

diff([1,3,5,10,21],0,[1,6,10,21,32],0,enter,leave,unchage);

console.log("enter:",enter);
console.log("leave:",leave);
console.log("unchage:",unchage);








