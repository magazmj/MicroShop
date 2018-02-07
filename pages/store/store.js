//store.js
//获取应用实例
const app = getApp()
const Utils = require("../../utils/util.js")
const HOST = Utils.host
const Serial = Utils.serial
const Parallel = Utils.parallel

const PAGASIZE = 6;

Page({
  data: {
    tabs: [{ id: 1, name: "服装" },
    { id: 2, name: "美食" },
    { id: 3, name: "家居" },
    { id: 4, name: "美妆" },
    { id: 5, name: "养生" },
    { id: 6, name: "电子产品" }],
    list: [],
    tab_idx: 0,
    hasMore: true,
    host: HOST
  },
  onLoad: function () {
    //初始化变量
    this.curPage = 1
    this.total = 0;
    this.loading = false

    this.refresh()
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
      url: HOST + 'micro_api/portal_list',
      data: {
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
      complete: () => {}
    })
  },
  onSelectItem: function (e) {
    var index = e.target.dataset.idx
    var item = this.data.list[index];
    app.globalData.item = item
    wx.navigateTo({
      url: '../portal/portal'
    })
  },
  /**
 * 用户点击右上角分享
 */
  onShareAppMessage: function () {

  }
})