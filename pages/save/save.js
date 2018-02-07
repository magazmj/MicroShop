// pages/save/save.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    imageSrc: "",
    saveEnable: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var path = options.path
    this.setData({imageSrc: path})
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    wx.hideLoading()
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: "微商海报大师",
      path: '/pages/index/index',
      imageUrl: this.data.imageSrc,
      success: function() {
        wx.showToast({
          title: '转发成功',
        })
      }
    }
  },

  preview: function() {
    wx.previewImage({
      current: this.data.imageSrc,
      urls: [this.data.imageSrc]
    })
  },

  save: function() {
    this.setData({saveEnable: false})

    wx.saveImageToPhotosAlbum({
      filePath: this.data.imageSrc,
      success: (res) => {
        wx.showToast({
          title: '保存成功',
        })
      },
      complete: () => {
        this.setData({saveEnable: true})
      }
    })
  },
})