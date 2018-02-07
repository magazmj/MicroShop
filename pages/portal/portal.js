// pages/portal/portal.js
const Utils = require("../../utils/util.js")
const HOST = Utils.host
const Serial = Utils.serial
const Parallel = Utils.parallel
const Default_data = Utils.default_data
const DeepCopy = Utils.deepCopy

const PAGASIZE = 8
const GAP = 24
const TAB_HEIGHT = 110
const PRESS_TIMEOUT = 400
const TOUCHSLOP = 10
const BACKGROUND_COLOR = "white"
const FRAME_BG_COLOE = "#d7eff9"
const FRAME_EX_COLOR = "black"
const FRAME_ENTER_COLOR = "#01c8a5"
const BORDER_SELECT_WIDTH = 2
const BORDER_ENTER_WIDTH = 2
const SELECT_ALPHA = 0.7
const ALLOW_MOVE = true
const KEYBOARD_HEIGHT = 210
const SHOW_TIP = false

const app = getApp()

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
    faved: false,
    hideInput: true,
    hint: "",
    cursor: 0,
    host: HOST
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this._init(app.globalData.item)
    // this._init() //for test
  },
  onReady: function () {
    wx.hideLoading()

    wx.setNavigationBarTitle({
      title: this.item.name
    })
  },
  _init: function(item){
    // 1.获取参数
    this.item = DeepCopy(item)

    // 2.数据处理
    if (!this.item || !this.item.id || !this.item.name || !this.item.image || !this.item.config) {
      this.item = DeepCopy(Default_data)
    }

    this.item.config.backgrounds = this.item.config.backgrounds || []
    this.item.config.foregrounds = this.item.config.foregrounds || []
    this.item.config.rects = this.item.config.rects || []

    // 3.备份数据
    this.savedItem = JSON.stringify(this.item)

    // 4. 初始化变量
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
    this.drawDash = true
    this.scrollOffset = 0

    // 5.创建背景画布
    this.ctx = wx.createCanvasContext('myCanvas')

    // 6.获取模版数据
    this._refresh()

    // 7.适配大小
    this._computeContentSize(true)

    // 8.创建分层画布
    this._fitSize(true)

    // 9.下载图片
    this._downloadResource()
  },
  _computeContentSize: function(fitSize) {
    // 设置画布尺寸以及舞台区大小
    try {
      var res = wx.getSystemInfoSync()
      // 系统缩放因子
      this.ratio = res.pixelRatio
      console.log(this.ratio)
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
      this.contentTop = GAP / this.ratio

      this.previewScale = 1
      if(fitSize){
        if (this.contentHeight + this.contentTop > this.canvasHeight) {
          this.previewScale = (this.canvasHeight - 2 * this.contentTop) / this.contentHeight
          this.contentHeight = this.canvasHeight - 2 * this.contentTop
          this.contentWidth = this.contentHeight / imageRatio
          this.contentLeft = (this.canvasWidth - this.contentWidth) / 2
        }
      }

      this.contentTop += this.scrollOffset
    } catch (e) {
      // Do something when catch error
      console.error(e)
    }
  },
  _fitSize: function (first) {
    var item = JSON.parse(this.savedItem)

    // 归一化背景单元格尺寸
    for (var i = 0; i < this.item.config.backgrounds.length; i++) {
      this.item.config.backgrounds[i].rect = item.config.backgrounds[i].rect
      var rect = this.item.config.backgrounds[i].rect
      this._adjustRect(rect)

      // 设置图片大小
      var image = this.item.config.backgrounds[i].image
      if(image){
        image.left = rect[0]
        image.top = rect[1]
        image.scaleWidth = rect[2]
        image.scaleHeight = rect[3]
      }
    }

    // 归一化前景单元格尺寸
    for (var i = 0; i < this.item.config.foregrounds.length; i++) {
      this.item.config.foregrounds[i].rect = item.config.foregrounds[i].rect
      var rect = this.item.config.foregrounds[i].rect
      this._adjustRect(rect)

      // 设置图片大小
      var image = this.item.config.foregrounds[i].image
      if (image) {
        image.left = rect[0]
        image.top = rect[1]
        image.scaleWidth = rect[2]
        image.scaleHeight = rect[3]
      }
    }

    // 归一化图片单元格尺寸
    for (var i = 0; i < this.item.config.rects.length; i++) {
      this.item.config.rects[i].rect = item.config.rects[i].rect
      var rect = this.item.config.rects[i].rect
      this._adjustRect(rect)
    }

    // 归一化文本位置
    // 舞台与图片放缩因子
    var ratio = this.contentWidth / this.item.config.width
    for (var i = 0; i < this.item.config.texts.length; i++) {
      this.item.config.texts[i].pos = item.config.texts[i].pos
      var pos = this.item.config.texts[i].pos
      pos[0] = pos[0] * ratio + this.contentLeft
      pos[1] = pos[1] * ratio + this.contentTop
    }

    if(first){
      // 创建单元格画布
      this.clist = []
      var arr = []
      var count = this.item.config.rects.length
      for (var i = 0; i < count; i++) {
        var index = i + 1
        var context = wx.createCanvasContext('myCanvas' + index)
        this.clist.push({ offsetX: 0, offsetY: 0, context: context })
        arr.push(index)

        // 图片等比居中显示
        this._resetImagePostion(i)
      }

      this.foreground = wx.createCanvasContext('myCanvas' + (count + 1))
      arr.push(index + 1)

      this.setData({ canvasList: arr, templateId: this.item.id }, () => {
        this.draw()
      })
    }
  },
  _downloadResource: function() {
    wx.showLoading({
      title: '正在加载资源',
      mask: true
    })
    var count = 0
    Parallel(this.item.config.backgrounds.length, this._downloadBackground, 
    (err, results) => {
      count++
      if(count == 3){
        wx.hideLoading()
      }
      if (err){
        if (SHOW_TIP){
          wx.showToast({
            title: '下载背景图片失败',
          })
        }
        return
      }
      for(var i = 0; i < results.length; i++){
        var path = results[i]
        var image = this.item.config.backgrounds[i].image
        if(image && path){
          image.path = path
          image.downloaded = true
        }
      }
      this.draw()
    })
    Parallel(this.item.config.texts.length, this._downloadTextIcon,
      (err, results) => {
        count++
        if (count == 3) {
          wx.hideLoading()
        }
        if (err) {
          if (SHOW_TIP) {
            wx.showToast({
              title: '下载图标失败',
            })
          }
          return
        }
        for (var i = 0; i < results.length; i++) {
          var path = results[i]
          var icon = this.item.config.texts[i].icon
          if (path) {
            icon.path = path
            icon.downloaded = true
          }
        }
        this.draw()
      })
    Parallel(this.item.config.foregrounds.length, this._downloadForeground,
      (err, results) => {
        count++
        if (count == 3) {
          wx.hideLoading()
        }
        if (err) {
          if (SHOW_TIP) {
            wx.showToast({
              title: '下载前景图片失败',
            })
          }
          return
        }
        for (var i = 0; i < results.length; i++) {
          var path = results[i]
          var image = this.item.config.foregrounds[i].image
          if (image && path) {
            image.path = path
            image.downloaded = true
          }
        }
        this.draw()
      })
  },
  _downloadBackground: function(i, callback) {
    var image = this.item.config.backgrounds[i].image
    if (image && image.path) {
      var url = HOST + image.path
      console.log(url)
      wx.downloadFile({
        url: url,
        success: (res) => {
          if (res.statusCode === 200) {
            callback(null, res.tempFilePath)
          } else {
            console.error("download background error")
            callback("download background error")
          }
        },
        fail: (err) => {
          console.log("download background error")
          callback("download background error")
        }
      })
    }else{
      callback(null, null)
    }
  },
  _downloadTextIcon: function (i, callback) {
    var icon = this.item.config.texts[i].icon
    if (icon && icon.path) {
      var url = HOST + icon.path
      console.log(url)
      wx.downloadFile({
        url: url,
        success: (res) => {
          if (res.statusCode === 200) {
            callback(null, res.tempFilePath)
          } else {
            console.error("download icon error")
            callback("download icon error")
          }
        },
        fail: (err) => {
          console.log("download icon error")
          callback("download icon error")
        }
      })
    } else {
      callback(null, null)
    }
  },
  _downloadForeground: function (i, callback) {
    var image = this.item.config.foregrounds[i].image
    if (image && image.path) {
      var url = HOST + image.path
      console.log(url)
      wx.downloadFile({
        url: url,
        success: (res) => {
          if (res.statusCode === 200) {
            callback(null, res.tempFilePath)
          } else {
            console.error("download foreground error")
            callback("download foreground error")
          }
        },
        fail: (err) => {
          console.log("download foreground error")
          callback("download foreground error")
        }
      })
    } else {
      callback(null, null)
    }
  },
  _adjustRect: function(rect) {
    var ratio = this.contentWidth / this.item.config.width

    rect[0] = this.contentLeft + rect[0] * ratio
    rect[1] = this.contentTop + rect[1] * ratio
    rect[2] = rect[2] * ratio
    rect[3] = rect[3] * ratio
  },
  _refresh: function () {
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
      url: HOST + 'micro_api/favorite_list',
      data: {
        token: app.globalData.token,
        curPage: this.curPage,
        pageSize: PAGASIZE
      },
      success: (res) => {
        var result = res.data
        console.log(result)
        if (result.code == 1) {
          this.total = result.total;
          var data = result.data

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

          var faved = false
          for(var i = 0; i < this.data.list.length; i++){
            if(this.data.list[i].id == this.item.id){
              faved = true
              break
            }
          }
          this.setData({ faved: faved })
        } else {
          this.loading = false
        }
      },
      fail: (res) => {
        this.loading = false
      }
    })
  },
  touchStart: function (e) {
    console.log("touchStart", e)

    this.touched = false
    this.longPress = false

    var x = e.touches[0].x
    var y = e.touches[0].y
    this.touchX = this.lastX = x
    this.touchY = this.lastY = y
    
    this.inputIndex = this._findTextRect(this.touchX, this.touchY)
    if (this.inputIndex > -1){
      var text = this.item.config.texts[this.inputIndex]
      this.setData({ hideInput: false, hint: text.text, cursor: text.text.length}, ()=>{
        if (text.pos[1] < KEYBOARD_HEIGHT + 30){
          this.scrollOffset = KEYBOARD_HEIGHT - text.pos[1] + 20
        }else{
          this.scrollOffset = -30
        }
        this._computeContentSize(true)
        this._fitSize(false)
        this._fitImageRect()
        this.draw()
      })
      return
    }
    
    this.selectIndex = this._findRect(this.touchX, this.touchY)
    if (this.selectIndex > -1) {
      this.touched = true
      this.draw()
      setTimeout(() => {
        if (this.touched) { // 未移动才能是长按事件
          console.log("long press start")

          if (!this.data.hideTemplate) {
            this.toggleTemplate()
          }

          this.touched = false
          if (ALLOW_MOVE) {
            this.longPress = true // 长按事件，可以开始移动了
          }
          this.moved = false

          this._resetCanvasOffset()

          this.draw()
        }
      }, PRESS_TIMEOUT)
    } else {
      if (!this.data.hideTemplate) {
        this.toggleTemplate()
      }
    }
  },
  touchMove: function (e) {
    console.log("touchMove")

    var x = e.touches[0].x
    var y = e.touches[0].y

    if (this.touched && this._judgeMoved(x, y)) {
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

    if (this.selectIndex < 0){
      this.lastX = x
      this.lastY = y
      return
    }

    var image = this.item.config.rects[this.selectIndex].image
    var rect = this.item.config.rects[this.selectIndex].rect
    var canvas = this.clist[this.selectIndex]

    if (this.scrolled && image) {
      var dx = x - this.lastX
      var dy = y - this.lastY

      image.left += dx
      if (image.left > rect[0]) {
        image.left = rect[0]
      } else if (image.left < rect[0] + rect[2] - image.scaleWidth) {
        image.left = rect[0] + rect[2] - image.scaleWidth
      }
      image.top += dy
      if (image.top > rect[1]) {
        image.top = rect[1]
      } else if (image.top < rect[1] + rect[3] - image.scaleHeight) {
        image.top = rect[1] + rect[3] - image.scaleHeight
      }
      this.draw()
    } else if (this.longPress && image) {

      if (!this.moved && this._judgeMoved(x, y)) {
        this.moved = true
      }

      if (this.moved) {
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
  touchEnd: function (e) {
    console.log("touchEnd")

    if (this.touched) {
      this.touched = false
      if (this.selectIndex > -1) {
        this.draw()

        if (this.item.config.rects[this.selectIndex].image) {
          if (!this.data.hideTemplate) {
            this.toggleTemplate()
            return
          }

          // TODO Edit
        } else {
          if (!this.data.hideTemplate) {
            this.toggleTemplate()
          }
        }

        this._chooseImage()
      }
    } else if (this.longPress) {
      console.log("long press end")

      this.longPress = false
      this.moved = false

      this._resetCanvasOffset()

      if (this.enterIdx != this.selectIndex && this.enterIdx != -1) {
        var image = this.item.config.rects[this.selectIndex].image
        this.item.config.rects[this.selectIndex].image = this.item.config.rects[this.enterIdx].image
        this.item.config.rects[this.enterIdx].image = image
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
  touchCancel: function (e) {
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
  _chooseImage: function() {
    wx.chooseImage({
      count: 1,
      success: (res) => {
        wx.showLoading({
          title: '正在加载',
        })
        var imagePath = res.tempFilePaths[0]
        wx.getImageInfo({
          src: imagePath,
          success: (res) => {
            this.item.config.rects[this.selectIndex].image = res
          },
          fail: (err) => {// hack emulator failed
            this.item.config.rects[this.selectIndex].image = { width: 50, height: 50, path: imagePath }
            wx.showToast({
              title: '加载图片失败'
            })
          },
          complete: () => {
            wx.hideLoading()
            this._resetImagePostion(this.selectIndex)
            this.draw()
          }
        })
      },
    })
  },
  typeText: function(e) {
    if (this.inputIndex > -1) {
      var text = this.item.config.texts[this.inputIndex];
      text.text = e.detail.value
      this.draw()
    }
  },
  inputFocus: function(e) {
    
  },
  inputBlur: function(e) {
    this.inputDone()
  },
  inputDone: function(e) {
    this.setData({ hideInput: true }, ()=>{
      this.scrollOffset = 0
      this._computeContentSize(true)
      this._fitSize(false)
      this._fitImageRect()
      this.draw()
    })
  },
  favorite: function(e) {
    console.log("favorite")

    if(this.faving) return
    this.faving = true

    console.log('start favirate')
    wx.request({
      url: HOST + 'micro_api/favorite',
      data: {
        token: app.globalData.token,
        id: this.item.id,
        fav: this.data.faved ? 0 : 1
      },
      success: (res) => {
        console.log(res.data)
        if (res.data.code == 1) {
          this.setData({ faved: !this.data.faved })
          wx.showToast({
            title: this.data.faved ? '收藏成功' : '取消收藏',
          })
          this._refresh()
        }
      },
      complete: () => {
        this.faving = false
      }
    })
  },
  toggleTemplate: function (e) {
    console.log("toggleTemplate")
    this.setData({ hideTemplate: !this.data.hideTemplate })
  },
  generateImage: function (e) {
    console.log("generateImage")

    if (!this.data.hideTemplate) {
      this.toggleTemplate()
    }

    if (this.saving) {
      return
    }
    this.saving = true

    wx.showLoading({
      title: '正在保存...',
      mask: true
    })

    this.drawDash = false//不显示虚线

    // this._computeContentSize(true)
    // this._fitSize(false)
    // this._fitImageRect()
    this.draw()

    setTimeout(() => {
      var count = this.clist.length
      Parallel(count, this.layerToImage, (err, paths) => {
        if (err) {
          console.log(err)
          wx.hideLoading()
          wx.showToast({
            title: '生成图片失败',
            image: '../../images/ic_delete.png'
          })
          this.saving = false
          this.combined = false
          this.drawDash = true

          // this._computeContentSize(true)
          // this._fitSize(false)
          // this._fitImageRect()

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
              this.drawDash = true

              // this._computeContentSize(true)
              // this._fitSize(false)
              // this._fitImageRect()

              this.draw()
            }
          })
        }, 1000)
      })
    }, 800)
  },
  onSelectTemplate: function (e) {
    console.log("onSelectTemplate")
    var index = e.target.dataset.idx
    var temp = this.data.list[index]
    if (temp.id != this.item.id){
      //TODO translate image

      var j = 0;
      for (var i = 0; i < this.item.config.rects.length; i++) {
        if (this.item.config.rects[i].image) {
          temp.config.rects[j].image = this.item.config.rects[i].image
          j++
        }
      }

      this._init(temp)
    }
  },
  layerToImage: function (i, callback) {
    var rect = this.item.config.rects[i].rect
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
  _resetCanvasOffset: function () {
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
  _findRect: function (x, y) {
    for (var i = this.item.config.rects.length - 1; i >= 0; i--) {
      var rect = this.item.config.rects[i].rect
      if (this._touchInRect(x, y, rect)) {
        return i
      }
    }
    return -1
  },
  _findTextRect: function (x, y) {
    for (var i = 0; i < this.item.config.texts.length; i++) {
      var text = this.item.config.texts[i]
      var size = text.size * this.previewScale / this.ratio
      var pos = text.pos
      var rect = []
      var textWidth = this._computeFontWidth(text.text, size)
      if (textWidth == 0) {
        textWidth = 50
      }
      if (text.align == 'center'){
        rect[0] = pos[0] - textWidth / 2
        rect[1] = pos[1]
        rect[2] = textWidth
        rect[3] = size * 3 / 2
      }else if(text.align == 'left'){
        rect[0] = pos[0]
        rect[1] = pos[1]
        rect[2] = textWidth
        rect[3] = size * 3 / 2
      }else{
        rect[0] = pos[0] - textWidth
        rect[1] = pos[1]
        rect[2] = textWidth
        rect[3] = size * 3 / 2
      }
      if (this._touchInRect(x, y, rect)) {
        return i
      }
    }
    return -1
  },
  _touchInRect: function (x, y, rect) {
    if (x > rect[0] && x < rect[0] + rect[2] && y > rect[1] && y < rect[1] + rect[3]) {
      return true
    }
    return false
  },
  _judgeMoved: function (x, y) {
    return Math.sqrt((x - this.touchX) * (x - this.touchX) + (y - this.touchY) * (y - this.touchY)) > TOUCHSLOP
  },
  _resetImagePostion: function (i) {
    var image = this.item.config.rects[i].image
    var rect = this.item.config.rects[i].rect
    if (image) {
      var imageRatio = image.width / image.height
      var rectRatio = rect[2] / rect[3]
      if (imageRatio > rectRatio) {// 更宽
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
  _fitImageRect: function () {
    for (var i = 0; i < this.item.config.rects.length; i++){
      this._resetImagePostion(i)
    }
  },
  _isChinese: function(char) {
    if (escape(char).indexOf("%u") < 0) return false
    return true
  },
  _computeFontWidth: function(text, fontSize) {
    if(!text) return 0

    var width = 0
    for(var i = 0; i < text.length; i++){
      if (this._isChinese(text[i])){
        width += fontSize * 1.05
      }else {
        width += fontSize * 2 / 3
      }
    }
    return width
  },
  draw: function () {
    this._drawBackground()
    this._drawLayer()
    this._drawForeground(this.combined)
  },
  _drawBackground: function () {
    var context = this.ctx

    // 绘制背景颜色
    context.save()
    context.setFillStyle(this.item.config.color)
    context.fillRect(this.contentLeft, this.contentTop, this.contentWidth, this.contentHeight)
    context.restore()

    // 绘制背景图片
    for (var i = 0; i < this.item.config.backgrounds.length; i++) {
      var background = this.item.config.backgrounds[i]
      var image = background.image
      var color = background.color
      var rect = background.rect
      var alpha = background.alpha
      if(image && image.downloaded){// 有图片绘制图片(优先级高)
        context.save()
        if (alpha) {
          context.setGlobalAlpha(alpha)
        }
        context.drawImage(image.path, image.left, image.top, image.scaleWidth, image.scaleHeight)
        context.setGlobalAlpha(1)
        context.restore()
      } else if (!image && color) {// 有颜色绘制颜色
        context.save()
        if (alpha) {
          context.setGlobalAlpha(alpha)
        }
        context.setFillStyle(color)
        context.fillRect(rect[0], rect[1], rect[2], rect[3])
        context.setGlobalAlpha(1)
        context.restore()
      }
    }

    // 绘制添加按钮
    for (var i = 0; i < this.item.config.rects.length; i++) {
      this._drawAddButton(context, i)
    }

    if (this.combined) {
      for (var i = 0; i < this.layer.length; i++) {
        var rect = this.item.config.rects[i].rect
        if (this.layer[i]) {
          context.drawImage(this.layer[i], rect[0], rect[1], rect[2], rect[3])
        }
      }
    }

    context.draw()
  },
  _drawLayer: function () {
    if (this.combined) return

    var count = this.item.config.rects.length
    for (var i = count - 1; i >= 0; i--) {
      var rect = this.item.config.rects[i].rect
      var color = this.item.config.rects[i].color
      var image = this.item.config.rects[i].image
      var canvas = this.clist[i];

      var context = canvas.context

      if (!this.moved || i != count - 1 || (this.selectIndex == i && i == count - 1)){
        this._drawAddButton(context, i)
      }

      if (this.moved) {
        if (this.selectIndex == i) {
          canvas = this.clist[count - 1]
        } else if (i == count - 1) {
          canvas = this.clist[this.selectIndex]
        }
      }

      context = canvas.context
      var offsetX = canvas.offsetX
      var offsetY = canvas.offsetY

      // 绘制图像
      if (image) {
        context.save()
        if (this.longPress && this.selectIndex == i) {
          context.translate(offsetX, offsetY)
          context.setGlobalAlpha(SELECT_ALPHA)
        }
        context.beginPath()
        context.rect(rect[0], rect[1], rect[2], rect[3])
        context.clip()
        if (color){
          context.setFillStyle(color)
          context.fill()
        }
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
      } else if (this.longPress) {
        if (this.enterIdx != this.selectIndex && this.enterIdx == i) {
          context.setLineWidth(BORDER_ENTER_WIDTH)
          context.setStrokeStyle(FRAME_ENTER_COLOR)
          context.strokeRect(rect[0] - BORDER_ENTER_WIDTH / 2, rect[1] - BORDER_ENTER_WIDTH / 2, rect[2] + BORDER_ENTER_WIDTH, rect[3] + BORDER_ENTER_WIDTH)
        }
      }
      if(color){// 绘制边框
        context.setStrokeStyle(color)
        context.setLineWidth(2) //边框宽度暂定为2，后面可以传入
        context.strokeRect(rect[0], rect[1], rect[2], rect[3])
      }
      context.draw()
    }
  },
  _drawForeground: function (combined) {
    var context;
    if (combined) {
      context = this.ctx
    }else{
      context = this.foreground
    }

    // 绘制背景图片
    for (var i = 0; i < this.item.config.foregrounds.length; i++) {
      var foreground = this.item.config.foregrounds[i]
      var image = foreground.image
      var color = foreground.color
      var rect = foreground.rect
      var alpha = foreground.alpha
      if (image && image.downloaded) {// 有图片绘制图片(优先级高)
        context.save()
        if(alpha){
          context.setGlobalAlpha(alpha)
        }
        context.drawImage(image.path, image.left, image.top, image.scaleWidth, image.scaleHeight)
        context.setGlobalAlpha(1)
        context.restore()
      } else if (!image && color) {// 有颜色绘制颜色
        context.save()
        context.setFillStyle(color)
        if (alpha) {
          context.setGlobalAlpha(alpha)
        }
        context.fillRect(rect[0], rect[1], rect[2], rect[3])
        context.setGlobalAlpha(1)
        context.restore()
      }
    }

    // 绘制文本, 注意：文本底色块由于时间关系未实现
    for (var i = 0; i < this.item.config.texts.length; i++) {
      context.save()
      var text = this.item.config.texts[i]
      var size = text.size * this.previewScale / this.ratio

      context.setFillStyle(text.color)
      context.setFontSize(size)
      context.setTextAlign(text.align)
      context.setTextBaseline('top')
      context.fillText(text.text, text.pos[0], text.pos[1])

      var textWidth = this._computeFontWidth(text.text, size)
      if (textWidth == 0) {
        textWidth = 50
      }

      if (this.drawDash) {
        context.setStrokeStyle('red')
        context.setLineWidth(1)
        context.setLineDash([2, 4], 5);
        if (text.align == 'center'){
          context.strokeRect(text.pos[0] - 2 - textWidth / 2, text.pos[1], textWidth, size * 3 / 2)
        } else if(text.align == 'left') {
          context.strokeRect(text.pos[0] - 2, text.pos[1], textWidth, size * 3 / 2)
        } else {
          context.strokeRect(text.pos[0] + 2 - textWidth, text.pos[1], textWidth, size * 3 / 2)
        }
      }

      // 绘制文本icon
      var icon = this.item.config.texts[i].icon
      if (icon && icon.downloaded) {
        if (text.align == 'left') {
          context.drawImage(icon.path, text.pos[0] + textWidth, text.pos[1] + size / 5, size, size)
        } else {
          context.drawImage(icon.path, text.pos[0] + 2, text.pos[1] + size / 5, size, size)
        }
      }
      context.restore()
    }
    context.draw(combined)
  },
  _drawAddButton: function (context, i) {
    var rect = this.item.config.rects[i].rect
    var image = this.item.config.rects[i].image

    context.save()
    context.setFillStyle(FRAME_BG_COLOE)
    context.fillRect(rect[0], rect[1], rect[2], rect[3])

    // if (!this.combined){
    // 绘制按钮
    var buttonSize = 42 * this.previewScale / this.ratio
    if (!image /*&& !this.combined*/) {
      var left = rect[0] + (rect[2] - buttonSize) / 2;
      var top = rect[1] + (rect[3] - buttonSize) / 2 - buttonSize / 2 + 3
      context.drawImage("../../images/add_button.png", left, top, buttonSize, buttonSize)
      context.setTextAlign('center')
      context.setFillStyle("#b5c9d2")
      context.setTextBaseline('top')
      context.setFontSize(12 * this.previewScale)
      context.fillText('添加照片', rect[2] / 2 + rect[0], top + buttonSize + 3)
    }
    // }
    context.restore()
  }
})