//fv
const isArr = Array.isArray
const arrayfy = (arr) => (!arr ? [] : isArr(arr) ? arr : [arr])
const same = (a, b) => {
    return getKey(a) === getKey(b) && getType(a) === getType(b)
}
const getKey = (vdom) => (vdom == null ? vdom : vdom.key)
const getType = (vdom) => (isFn(vdom.type) ? vdom.type.name : vdom.type)
const isFn = (x: any): x is Function => typeof x === 'function'
const isStr = (s: any): s is number | string => typeof s === 'number' || typeof s === 'string'

function clone(a, b) {
    a.lastProps = b.props
    a.node = b.node
    a.kids = b.kids
    a.hooks = b.hooks
    a.ref = b.ref
}

//type
type FreText = string | number
type Key = FreText
interface Attributes extends Record<string, any> {
  key?: Key
  children?: FreNode
  ref?: Ref
}
interface FreElement<P extends Attributes = any, T = string> {
  type: T
  props: P
  key: string
}
type Ref<T = any> = RefCallback<T> | RefObject<T> | null

type RefCallback<T> = {
  bivarianceHack(instance: T | null): void
}['bivarianceHack']

interface RefObject<T> {
  current: T
}


type FreNode = FreText | FreElement | FreNode[] | boolean | null | undefined


//enum update状态
//注意按位与按位或和左移
export const enum OP {
  REMOVE = 1 << 4,
  UPDATE = 1 << 1,
  INSERT = 1 << 3,
  MOUNT = UPDATE | INSERT,
}

let deletes = []


/*==========================fre===========================*/

  //test
  /*
   const states = [
     [1, 2, 3],
     [3, 1, 2], // shift right
     [1, 2, 3],
     [2, 3, 1], // shift left
     [1, 2, 3],
     [1, 3], // remove from middle
     [1, 2, 3],
     [2, 3], // remove first
     [1, 2, 3],
     [1, 2], // remove last
     [1, 2, 3],
     [3, 2, 1], // reverse order
     [3, 4, 2, 5, 1], // reverse order
  ]
  */


 

/*
//这部分和qcact差不过
const reconcile = (WIP: IFiber): IFiber | undefined => {

  isFn(WIP.type) ? updateHook(WIP) : updateHost(WIP)
  WIP.dirty = WIP.dirty ? false : 0

  if (WIP.child) return WIP.child
  while (WIP) {
    if (!preCommit && WIP.dirty === false) {
      preCommit = WIP
      WIP.sibling = null
      return null
    }
    if (WIP.sibling) return WIP.sibling
    WIP = WIP.parent
  }
}

const updateHost = (WIP: IFiber): void => {
  WIP.parentNode = getParentNode(WIP) as any
  //node挂载的是dom
  if (!WIP.node) {
    WIP.node = createElement(WIP) as HTMLElementEx
  }
  reconcileChildren(WIP, WIP.props.children)
}



*/



//WIP是当前WIP
//children是当前wip的children
const reconcileChildren = (WIP: any, children: FreNode): void => {
    

    //问题一个是WIP.kids一个是children，为什么他们能对比
    //应该是kids挂载的是旧的数据

    //fiber吗，理论上这里kids挂的应该是旧的children
    let aCh = WIP.kids || [],
    //children
    bCh = (WIP.kids = arrayfy(children) as any),
    aHead = 0,
    bHead = 0,
    aTail = aCh.length - 1,
    bTail = bCh.length - 1,
    map = null,
    //按照children的长度创建新数组
    ch = Array(bCh.length)

  
    while (aHead <= aTail && bHead <= bTail) {


      let temp = null

      // `null` means old part at head has already been used
      // below; skip
      if (aCh[aHead] == null) {
        aHead++
      } 
      // `null` means old part at tail has already been used
      //  below; skip
      else if (aCh[aTail] == null) {
        aTail--
      } 
      
      // Old head matches new head; update in place
      else if (same(aCh[aHead], bCh[bHead])) {
        
        temp = bCh[bHead]
        clone(temp, aCh[aHead])
        temp.tag = OP.UPDATE
        ch[bHead] = temp
        aHead++
        bHead++
      } 
      // Old head matches new tail; update and move to new tail
      else if (same(aCh[aTail], bCh[bTail])) {
 
        temp = bCh[bTail]
        clone(temp, aCh[aTail])
        temp.tag = OP.UPDATE
        ch[bTail] = temp
        aTail--
        bTail--
      } 


      // Old head matches new tail; update and move to new tail

      else if (same(aCh[aHead], bCh[bTail])) {

        //主要是对bch进行操作，另外在ch中也存了一份
        temp = bCh[bTail]
        clone(temp, aCh[aHead])
        temp.tag = OP.MOUNT
        //意思是在aCh[aTail].node.nextSibling节点前插入本temp
        //但是after主要是针对Insert来说的，MOUNT本身没有太大意义
        temp.after = aCh[aTail].node.nextSibling

        //放在新数组的尾巴
        ch[bTail] = temp
        aHead++
        bTail--
      } 
      


      // Old tail matches new head; update and move to new head

      //               oldHead v  v oldTail
      //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
      //   newParts: [0, 2, 1, 4,  ,  , 6] <- old tail matches new
      //   newKeys:  [0, 2, 1, 4, 3, 7, 6]   head: update & move 4,
      //                                     advance oldTail & newHead
      //               newHead ^     ^ newTail


      else if (same(aCh[aTail], bCh[bHead])) {

        //主要是对bch进行操作，另外在ch中也存了一份
        temp = bCh[bHead]
        clone(temp, aCh[aTail])
        temp.tag = OP.MOUNT
        temp.after = aCh[aHead].node
        ch[bHead] = temp
        aTail--
        bHead++
      } 

      else {

        // Lazily generate key-to-index maps, used for removals &
        // moves below
        if (!map) {
          //新建MAP
          map = new Map()
          //将旧头给i
          let i = aHead
          //oldKeyToIndexMap
          while (i < aTail) map.set(getKey(aCh[i]), i++)
        }

        //newHead key
        const key = getKey(bCh[bHead])

          /*
         neither head nor tail match, and neither
         were removed; 
         so find the `newHead` key in the
         `oldKeyToIndexMap`, 
         and move that old part's DOM into the
         next head position 
          */

          //         oldHead v        v oldTail
          //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
          //   newParts: [0, 2,  ,  ,  ,  , 6] <- stuck: update & move 2
          //   newKeys:  [0, 2, 1, 4, 3, 7, 6]    into place and advance
          //                                      newHead
          //         newHead ^           ^ newTail
        if (map.has(key)) {



          const oldKid = aCh[map.get(key)]
          
          temp = bCh[bHead]
          clone(temp, oldKid)
          temp.tag = OP.MOUNT
          
          temp.after = aCh[aHead]?.node
          

          ch[bHead] = temp
          

          aCh[map.get(key)] = null


        } 
        else {
         // otherwise create and insert a new part 
          temp = bCh[bHead]
          temp.tag = OP.INSERT
          temp.node = null
          //意思是在旧的aCh[aHead]?.node之前加上我们这个temp
          temp.after = aCh[aHead]?.node
        }
        bHead++
      }
    }


    //                   (oldHead > oldTail)
    //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
    //   newParts: [0, 2, 1, 4, 3, 7 ,6] <- create and insert 7
    //   newKeys:  [0, 2, 1, 4, 3, 7, 6]
    //                     newHead ^ newTail

    const after = ch[bTail + 1]?.node//从这里可以看出来是下一个

    // Add parts for any remaining new values
    // For all remaining additions, we insert before last new
    // tail, since old pointers are no longer valid
    //对于剩下的所有增加的内容，我们在最后一个新的内容之前插入。
    //因为旧的指针不再有效。
    while (bHead <= bTail) {//上边的例子是bHead==bTail的情况
      let temp = bCh[bHead]//是对bch的操作
      temp.tag = OP.INSERT
      temp.after = after
      temp.node = null
      bHead++
    }
    //其中fiber node是新标签，after是旧标签
    //=======这里的意思是在6之前加上7，其中6是after==========
    // parentNode.insertBefore(fiber.node, after)

    // Remove any remaining unused old parts
    
    while (aHead <= aTail) {

      let oldFiber = aCh[aHead]
      if (oldFiber) {
        oldFiber.tag = OP.REMOVE
        deletes.push(oldFiber)
      }
      aHead++
    }


    //形成链表的过程,和原来的状态是一样的
    for (var i = 0, prev = null; i < bCh.length; i++) {
      const child = bCh[i]
      child.parent = WIP
      if (i > 0) {
        prev.sibling = child
      } else {
        WIP.child = child
      }
      prev = child
    }
  }





/*====================qcact==================
 /*
 function performUnitOfWork(fiber){

    const isFunctionComponent = fiber.type instanceof Function
    //如果是函数组件和hooks
    if(isFunctionComponent){
      updateFunctionComponent(fiber);
    }else{
      //我们这里走的是一般流程
      updateHostComponent(fiber);
    }

    //第一次把child返回回去，下次进来再找child的child
    //往下一直找child，找到底
    if(fiber.child){
      return fiber.child
    }

    //如果没有child了，在树的最底层child开始找它的兄弟姐妹
    let nextFiber = fiber;


    while(nextFiber){
      //如果有兄弟 就返回兄弟
      if(nextFiber.sibling){
        return nextFiber.sibling
      }
      //如果没有兄弟了，找到父节点，注意这里没有返回
      //所以会继续循环，到while里的if寻找叔叔辈返回
      nextFiber = nextFiber.parent;
    }

  }


  //如果是hostComponent，也就是原来的数据结构
  function updateHostComponent(fiber){
    //如果传进来没有dom这里会新建
    if(!fiber.dom){
      fiber.dom = createDom(fiber);
    }

    //create new fibers
    const elements = fiber.props.children
    //校对
    reconcileChildren(fiber,elements);
    
  }





  function reconcileChildren(wipFiber, elements) {

    let index = 0
    //判断是否有旧的fiber，第一遍之后alternate就有值了
    let oldFiber = wipFiber.alternate  && wipFiber.alternate.child;
    let prevSibling = null


    //对children进行遍历
    //while里边只剩下两个重要的东西，oldFiber和element
    //这里主要是比对他们，然后把变化应用到dom
    while(index < elements.length || oldFiber != null){

      const element = elements[index];
      //这东西就是fiber的本来面目呀
      let newFiber = null;

      //type判断
      const sameType = 
        oldFiber && 
        element &&
        element.type === oldFiber.type


      //=============type1:  update the node========================
      //更新的时候，会用到oldFiber，也就是交替节点，这个出现在第一遍之后
      if(sameType){

        newFiber = {
          type:oldFiber.type,
          props:element.props,
          dom:oldFiber.dom,
          parent:wipFiber,
          alternate:oldFiber,
          effectTag:"UPDATE" //commit阶段使用
        }
      }

      //=============type2: add this node===========================
      if(element && !sameType){
        //需要新建dom节点
        newFiber = {
          type:element.type,
          props:element.props,
          dom:null,
          parent:wipFiber,
          alternate:null,//没有旧的
          effectTag:"PLACEMENT"
        }

        //dom设置为null返回新工作空间的时候就会新建
      }

      //=============type3：delete the oldFiber's dom node=============

      if(oldFiber && !sameType){
        oldFiber.effectTag = "DELETION";
        deletions.push(oldFiber);
      }




      //objecttives
      //上边经过更新、新增和删除，生成newFiber，等待渲染

      //这个是为了下一轮兄弟节点的额对比
      if (oldFiber) {
        oldFiber = oldFiber.sibling
      }
  
      if (index === 0) {
        //1.我们知道index == 0的时候。newFiber的指针指向child
        wipFiber.child = newFiber 
      } else if (element) {
        //3.我们假设这里走到了index == 1，相当于在child的基础上加了sibling
        //以此类推
        prevSibling.sibling = newFiber
      }
  
      //2.index==0结束之后，我们又把wipFiber.child的指针给了prevSibling
      prevSibling = newFiber
      index++
      
    }
  }

*/





