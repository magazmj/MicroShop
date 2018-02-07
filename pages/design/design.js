// pages/design/design.js
const app = getApp() 
const Utils = require("../../utils/util.js")
const HOST = Utils.host
const Serial = Utils.serial
const Parallel = Utils.parallel
const DeepCopy = Utils.deepCopy

const PAGASIZE = 8;
const GAP = 30
const TAB_HEIGHT = 140
const PRESS_TIMEOUT = 400
const TOUCHSLOP = 10
const FRAME_BORDER_COLOR = "white"
const FRAME_BG_COLOE = "#d5eff7"
const FRAME_EX_COLOR = "black"
const FRAME_ENTER_COLOR = "#01c8a5"
const BORDER_SELECT_WIDTH = 2
const BORDER_ENTER_WIDTH = 2
const SELECT_ALPHA = 0.7
const ALLOW_MOVE = true

Page({

  /**
   * 页面的初始数据
   */
  data: {
    list: [],
    canvasList: [],
    hideTemplate: true,
    hasMore: true,
    templateId: 0,
    host: HOST
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 获取参数
    this.item = DeepCopy(app.globalData.item)

    if (!this.item || !this.item.id || !this.item.name || !this.item.image || !this.item.config) {
      this.item = {
        id: 1,
        name: "模版01",
        image: "/images/pintu_01.jpg",
        icon: "/images/pintu_icon_01.jpg",
        config: {
          width: 718,
          height: 958,
          rects: [
            [20, 20, 678, 918]
          ]
        },
        images: [""]
      }
    }

    //初始化变量
    this.touched = false
    this.curPage = 1
    this.total = 0;
    this.loading = false
    this.clist = []
    this.saving = false
    this.layer = []
    this.combined = false
    this.moved = false
    this.scrolled = false
    this.enterIdx = -1

    // 创建背景画布
    this.ctx = wx.createCanvasContext('myCanvas')

    // 获取模版数据
    this.refresh()

    // 设置画布尺寸以及舞台区大小
    try {
      var res = wx.getSystemInfoSync()
      // 系统缩放因子
      this.ratio = res.pixelRatio
      // 窗口宽度
      var windowWidth = res.windowWidth;
      // 素材比例
      var imageRatio = this.item.config.height / this.item.config.width

      // 设置画布宽度、高度
      this.canvasWidth = windowWidth
      this.canvasHeight = res.windowHeight - TAB_HEIGHT / this.ratio

      // 设置舞台left、top、width、height
      this.contentWidth = windowWidth - GAP * 2 / this.ratio
      this.contentHeight = this.contentWidth * imageRatio
      this.contentLeft = GAP / this.ratio
      this.contentTop = (this.canvasHeight - this.contentHeight) / 2
    } catch (e) {
      // Do something when catch error
    }

    this.init()
  },
  onReady: function () {
    wx.hideLoading()

    wx.setNavigationBarTitle({
      title: this.item.name
    })
  },
  init: function() {
    // 舞台与图片放缩因子
    var ratio = this.contentWidth / this.item.config.width

    // 归一化单元格尺寸
    for (var i = 0; i < this.item.config.rects.length; i++) {
      var rect = this.item.config.rects[i]
      rect[0] = this.contentLeft + rect[0] * ratio
      rect[1] = this.contentTop + rect[1] * ratio
      rect[2] = rect[2] * ratio
      rect[3] = rect[3] * ratio

      // 超出边界的情况
      if (rect[0] + rect[2] > this.contentLeft + this.contentWidth) {
        rect[2] = this.contentLeft + this.contentWidth
        if (rect[0] > rect[2]) {
          rect[0] = rect[2] - 8
        }
      }
      if (rect[1] + rect[3] > this.contentTop + this.contentHeight) {
        rect[3] = this.contentTop + this.contentHeight
        if (rect[1] > rect[3]) {
          rect[1] = rect[3] - 8
        }
      }
    }

    // 创建单元格画布
    this.clist = []
    var arr = []
    for (var i = 0; i < this.item.config.rects.length; i++) {
      var index = i + 1
      var context = wx.createCanvasContext('myCanvas' + index)
      this.clist.push({offsetX: 0, offsetY: 0, context: context})
      arr.push(index)

      // 图片等比居中显示
      this._resetImagePostion(i)
    }

    this.setData({ canvasList: arr, templateId: this.item.id}, () => {
      this.draw()
    })
  },
  refresh: function () {
    this.curPage = 1
    this.loadData()
  },
  loadMore: function (e) {
    if (this.loading || this.data.list.length >= this.total) {
      return
    }
    this.curPage++;
    this.loadData()
  },
  loadData: function () {
    this.loading = true
    wx.request({
      url: HOST + 'micro_api/pintu_list',
      data: {
        curPage: this.curPage,
        pageSize: PAGASIZE
      },
      success: (res) => {
        var result = res.data
        if (result.code == 1) {
          this.total = result.total;

          // 添加图片数组占位
          var data = result.data.map(function (item) {
            item.images = []
            for (var i = 0; i < item.config.rects.length; i++) {
              item.images.push("")
            }
            return item
          })

          var more = true
          if (this.data.list.length + data.length >= this.total) {
            more = false
          }

          if (this.curPage == 1) {
            this.setData({ list: data, hasMore: more },
              () => {
                this.loading = false
              })
          } else {
            this.setData({ list: this.data.list.concat(data), hasMore: more },
              () => {
                this.loading = false
              })
          }
        } else {
          this.loading = false
          wx.showToast({
            title: '网络错误，稍后再试',
          })
        }
      },
      fail: (res) => {
        this.loading = false
        wx.showToast({
          title: '网络错误，稍后再试',
        })
      }
    })
  },
  onSelectTemplate: function(e) {
    var temp = this.data.list[e.target.dataset.idx]

    //for simple deepCopy start
    temp = JSON.stringify(temp)
    temp = JSON.parse(temp)
    //for simple deepCopy end

    var j = 0;
    for(var i = 0; i < this.item.images.length; i++){
      if (this.item.images[i]){
        temp.images[j] = this.item.images[i]
        j++
      }
    }

    this.item = temp

    this.init()
  },
  touchStart: function(e) {
    console.log("touchStart", e)
    
    this.touched = false
    this.longPress = false

    var x = e.touches[0].x
    var y = e.touches[0].y
    this.touchX = this.lastX = x
    this.touchY = this.lastY = y
    this.selectIndex = this._findRect(this.touchX, this.touchY)

    if (this.selectIndex > -1){
      this.touched = true
      this.draw()
      setTimeout(() => {
        if(this.touched){ // 未移动才能是长按事件
          console.log("long press start")

          if (!this.data.hideTemplate) {
            this.toggleTemplate()
          }

          this.touched = false
          if(ALLOW_MOVE) {
            this.longPress = true // 长按事件，可以开始移动了
          }
          this.moved = false

          this._resetCanvasOffset()

          this.draw()
        }
      }, PRESS_TIMEOUT)
    }else{
      if (!this.data.hideTemplate) {
        this.toggleTemplate()
      }
    }
  },
  touchMove: function(e) {
    console.log("touchMove")

    var x = e.touches[0].x
    var y = e.touches[0].y

    if (this.touched && this._judgeMoved(x, y)){
      console.log("scrolled")

      if (!this.data.hideTemplate) {
        this.toggleTemplate()
        // return
      }

      this.touched = false
      this.scrolled = true

      this.draw()

      this.lastX = x
      this.lastY = y
      return
    }

    var image = this.item.images[this.selectIndex]
    var rect = this.item.config.rects[this.selectIndex]
    var canvas = this.clist[this.selectIndex]

    if (this.scrolled && image){
      var dx = x - this.lastX
      var dy = y - this.lastY

      image.left += dx
      if (image.left > rect[0]) {
        image.left = rect[0]
      } else if (image.left < rect[0] + rect[2] - image.scaleWidth){
        image.left = rect[0] + rect[2] - image.scaleWidth
      }
      image.top += dy
      if (image.top > rect[1]) {
        image.top = rect[1]
      } else if (image.top < rect[1] + rect[3] - image.scaleHeight){
        image.top = rect[1] + rect[3] - image.scaleHeight
      }
      this.draw()
    } else if (this.longPress && image){

      if (!this.moved && this._judgeMoved(x, y)){
        this.moved = true
      }

      if(this.moved){
        var dx = x - this.lastX
        var dy = y - this.lastY

        canvas = this.clist[this.item.config.rects.length - 1]
        canvas.offsetX += dx
        canvas.offsetY += dy

        this.enterIdx = this._findRect(this.lastX, this.lastY)

        this.draw()
      }  
    }

    this.lastX = x
    this.lastY = y
  },
  touchEnd: function(e) {
    console.log("touchEnd")

    if(this.touched){
      this.touched = false
      if (this.selectIndex > -1) {
        this.draw()

        if (this.item.images[this.selectIndex]){
          if (!this.data.hideTemplate) {
            this.toggleTemplate()
            return
          }
        }else{
          if (!this.data.hideTemplate) {
            this.toggleTemplate()
          }
        } 

        wx.chooseImage({
          count: 1,
          success: (res) => {
            var imagePath = res.tempFilePaths[0]
            wx.getImageInfo({
              src: imagePath,
              success: (res) => {
                this.item.images[this.selectIndex] = res
                this._resetImagePostion(this.selectIndex)
                this.draw()
              }
            })
          },
        })
      }
    } else if (this.longPress){
      console.log("long press end")

      this.longPress = false
      this.moved = false

      this._resetCanvasOffset()
      
      if (this.enterIdx != this.selectIndex && this.enterIdx != -1){
        var image = this.item.images[this.selectIndex]
        this.item.images[this.selectIndex] = this.item.images[this.enterIdx]
        this.item.images[this.enterIdx] = image
        this._resetImagePostion(this.selectIndex)
        this._resetImagePostion(this.enterIdx)
      }

      this.draw()
    }

    // 重置标记
    this.touched = false
    this.scrolled = false
    this.longPress = false
    this.moved = false
    this.enterIdx = -1
    
  },
  touchCancel: function(e) {
    console.log("touchCancel")

    this.touched = false
    this.longPress = false
    this.moved = false
    this.scrolled = false
    this.enterIdx = -1

    this._resetCanvasOffset()

    if (this.selectIndex > -1) {
      this.draw()
    }
  },
  toggleTemplate: function(e) {
    console.log("toggleTemplate")
    this.setData({ hideTemplate: !this.data.hideTemplate })
  },
  generateImage: function(e) {
    console.log("generateImage")

    if (!this.data.hideTemplate) {
      this.toggleTemplate()
    }

    for (var i = 0; i < this.item.config.rects.length; i++){
      if (!this.item.images[i]){
        wx.showModal({
          title: '提示',
          content: '有未上传图片的单元格，确定生成图片吗？',
          confirmColor: '#01c8a5',
          success: (res) => {
            if (res.confirm) {
              this._onGenerateImage()
            } else if (res.cancel) {
              console.log('用户点击取消')
            }
          }
        })
        return
      }
    }
    this._onGenerateImage()
  },
  _onGenerateImage: function() {
    if (this.saving) {
      return
    }
    this.saving = true

    wx.showLoading({
      title: '正在保存...',
      mask: true
    })

    var count = this.clist.length
    Parallel(count, this._layerToImage, (err, paths) => {
      if (err) {
        console.log(err)
        wx.hideLoading()
        wx.showToast({
          title: '生成图片失败',
          image: '../../images/ic_delete.png'
        })
        this.saving = false
        this.combined = false
        this.draw()
        return
      }

      this.layer = paths
      this.combined = true
      this.draw()

      setTimeout(() => {
        wx.canvasToTempFilePath({
          x: this.contentLeft,
          y: this.contentTop,
          width: this.contentWidth,
          height: this.contentHeight,
          destWidth: this.contentWidth * this.ratio,
          destHeight: this.contentHeight * this.ratio,
          canvasId: 'myCanvas',
          success: (res) => {
            wx.navigateTo({
              url: '../save/save?path=' + res.tempFilePath
            })
          },
          fail: (err) => {
            console.log(err)
            wx.hideLoading()
            wx.showToast({
              title: '生成图片失败',
              image: '../../images/ic_delete.png'
            })
          },
          complete: (res) => {
            this.saving = false
            this.combined = false
            this.draw()
          }
        })
      }, 1000)
    })
  },
  _layerToImage: function(i, callback){
    var rect = this.item.config.rects[i]
    wx.canvasToTempFilePath({
      x: rect[0],
      y: rect[1],
      width: rect[2],
      height: rect[3],
      destWidth: rect[2] * this.ratio,
      destHeight: rect[3] * this.ratio,
      canvasId: 'myCanvas' + (i + 1),
      success: (res) => {
        console.log(i, res.tempFilePath)
        callback(null, res.tempFilePath)
      }, fail: (err) => {
        console.log("failed", err)
        callback('wx.canvasToTempFilePath failed')
      }
    })
  },
  _resetCanvasOffset: function() {
    for (var i = 0; i < this.clist.length; i++) {
      var canvas = this.clist[i]
      canvas.offsetX = 0
      canvas.offsetY = 0
    }
  },
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    this.toggleTemplate()
  },
  _findRect: function(x, y) {
    for(var i = 0; i < this.item.config.rects.length; i++){
      var rect = this.item.config.rects[i]
      if(this._touchInRect(x, y, rect)){
        return i
      }
    }
    return -1
  },
  _touchInRect: function(x, y, rect) {
    if (x > rect[0] && x < rect[0] + rect[2] && y > rect[1] && y < rect[1] + rect[3]) {
      return true
    }
    return false
  },
  _judgeMoved: function(x, y){
    return Math.sqrt((x - this.touchX) * (x - this.touchX) + (y - this.touchY) * (y - this.touchY)) > TOUCHSLOP
  },
  _resetImagePostion: function(index) {
    this.item.images = this.item.images || []
    var image = this.item.images[index]
    var rect = this.item.config.rects[index]
    if (image) {
      var imageRatio = image.width / image.height
      var rectRatio = rect[2] / rect[3]
      if (imageRatio > rectRatio) {//更宽
        var imageWidth = rect[3] * imageRatio
        image.left = rect[0] + (rect[2] - imageWidth) / 2
        image.top = rect[1]
        image.scaleWidth = imageWidth
        image.scaleHeight = rect[3]
      } else {
        var imageHeight = rect[2] / imageRatio
        image.left = rect[0]
        image.top = rect[1] + (rect[3] - imageHeight) / 2
        image.scaleWidth = rect[2]
        image.scaleHeight = imageHeight
      }
    }
  },
  draw: function(){
    this._drawBackground()
    this._drawLayer()
  },
  _drawBackground: function() {
    var context = this.ctx

    // 绘制边框
    context.save()
    context.setFillStyle(FRAME_BORDER_COLOR)
    context.fillRect(this.contentLeft, this.contentTop, this.contentWidth, this.contentHeight)
    context.restore()

    for (var i = 0; i < this.item.config.rects.length; i++) {
      var rect = this.item.config.rects[i]
      // 绘制背景
      context.save()
      context.setFillStyle(FRAME_BG_COLOE)
      context.translate(rect[0], rect[1])
      context.fillRect(0, 0, rect[2], rect[3])

      // 绘制按钮
      var image = this.item.images[i]
      var buttonSize = 42 / this.ratio
      if (!image /*&& !this.combined*/) {
        var left = (rect[2] - buttonSize) / 2; 
        var top = (rect[3] - buttonSize) / 2 - buttonSize / 2 + 3
        context.drawImage("../../images/add_button.png", left, top, buttonSize, buttonSize)
        context.setTextAlign('center')
        context.setFillStyle("#b5c9d2")
        context.setFontSize(12)
        context.fillText('添加照片', rect[2] / 2, top + buttonSize + buttonSize / 2 + 3)
      }
      context.restore()
    }

    if(this.combined){
      for(var i = 0; i < this.layer.length; i++){
        var rect = this.item.config.rects[i]
        if (this.layer[i]){
          context.drawImage(this.layer[i], rect[0], rect[1], rect[2], rect[3])
        }
      }
    }

    context.draw()
  },
  _drawLayer: function() {
    if (this.combined) return

    var count = this.item.config.rects.length
    for (var i = count - 1; i >= 0; i--) {
      var rect = this.item.config.rects[i]
      var image = this.item.images[i]
      var canvas = this.clist[i];

      if (this.moved){
        if(this.selectIndex == i){
          canvas = this.clist[count - 1]
        }else if(i == count - 1){
          canvas = this.clist[this.selectIndex]
        }
      }

      var context = canvas.context
      var offsetX = canvas.offsetX
      var offsetY = canvas.offsetY

      // 绘制图像
      if (image) {
        context.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
        context.save()
        if (this.longPress && this.selectIndex == i){
          context.translate(offsetX, offsetY)
          context.setGlobalAlpha(SELECT_ALPHA)
        }
        context.beginPath()
        context.rect(rect[0], rect[1], rect[2], rect[3])
        context.clip()
        context.drawImage(image.path, image.left, image.top, image.scaleWidth, image.scaleHeight)
        context.setGlobalAlpha(1)
        context.restore()
      }
      if (i == this.selectIndex) {
        if (this.longPress && image/* && !this.moved*/) {
          context.save()
          context.setLineWidth(BORDER_SELECT_WIDTH)
          context.setStrokeStyle(FRAME_EX_COLOR)
          context.strokeRect(rect[0] - BORDER_SELECT_WIDTH / 2, rect[1] - BORDER_SELECT_WIDTH / 2, rect[2] + BORDER_SELECT_WIDTH, rect[3] + BORDER_SELECT_WIDTH)
          context.restore()
        }
        else if (this.touched && !image) {
          context.setFillStyle('black')
          context.setGlobalAlpha(0.08)
          context.fillRect(rect[0], rect[1], rect[2], rect[3])
          context.setGlobalAlpha(1)
        }
      }else if (this.longPress) {
        if (this.enterIdx != this.selectIndex && this.enterIdx == i){
          context.setLineWidth(BORDER_ENTER_WIDTH)
          context.setStrokeStyle(FRAME_ENTER_COLOR)
          context.strokeRect(rect[0] - BORDER_ENTER_WIDTH / 2, rect[1] - BORDER_ENTER_WIDTH / 2, rect[2] + BORDER_ENTER_WIDTH, rect[3] + BORDER_ENTER_WIDTH)
        }
      }
      context.draw()
    }
  }
})