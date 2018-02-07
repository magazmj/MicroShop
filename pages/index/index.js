//index.js
const app = getApp()
const Utils = require("../../utils/util.js")
const HOST = Utils.host
const Serial = Utils.serial
const Parallel = Utils.parallel

const PAGASIZE = 6;

Page({
  data: {
    list: [],
    hasMore: true,
    host: HOST
  },
  onLoad: function () {
    //初始化变量
    this.curPage = 1
    this.total = 0;
    this.loading = false

    //请求网络
    wx.showLoading({
      title: '正在加载',
      mask: true
    })
    this.refresh()
  },
  refresh: function() {
    this.curPage = 1
    this.loadData()
  },
  loadMore: function(e){
    if (this.loading || this.data.list.length >= this.total){
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
          var data = result.data.map(function(item){
            item.images = []
            for (var i = 0; i < item.config.rects.length; i++){
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
      },
      complete: ()=>{
        wx.hideLoading()
      }
    })
  },
  onSelectItem: function (e) {
    var index = e.target.dataset.idx
    var item = this.data.list[index];
    var count = item.config.rects.length
    
    this.filePaths = []

    // 开始选择图片
    wx.chooseImage({
      count: count,
      sourceType: ['album'],
      success: (res) => {
        wx.showLoading({
          title: '正在加载...',
          mask: true
        })
        var size = 0
        var err = 0
        this.filePaths = res.tempFilePaths
        var length = this.filePaths.length

        //TODO delete when online。 ---start---
        for (var i = 0; i < length; i++) {
          item.images[i] = { width: 44, height: 44, path: res.tempFilePaths[i] }
        }
        //TODO delete ---end---

        Parallel(count, this.getImageInfo, function(err, values){
          if(!err){
            for(var i = 0; i < count; i++){
              item.images[i] = values[i]
            }
          }else{
            console.log(err)
          }
          app.globalData.item = item
          wx.navigateTo({
            url: '../design/design'
          })
        })
      }
    })
  },
  getImageInfo: function(i, callback) {
    var imagePath = this.filePaths[i]
    if (imagePath) {
      wx.getImageInfo({
        src: imagePath,
        success: (res) => {
          callback(null, res)
        },
        fail: function () {
          callback('wx.getImageInfo error')
        }
      })
    }else{
      callback(null, '')
    }
  },
  /**
 * 用户点击右上角分享
 */
  onShareAppMessage: function () {

  }
})
