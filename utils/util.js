const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

const serial = function(count, callback, last) {

  if (typeof count != 'number') {
    console.error('count is not number')
    return
  }

  if(typeof callback != 'function'){
    console.error('callback is not function')
    return
  }

  if (typeof last != 'function') {
    console.error('last is not function')
    return
  }

  var results = []
  var index = -1

  if (count == 0) {
    last("empty", null)
    return
  }

  function next(err, res) {
    if(err) {
      last(err)
      return
    }

    if (index > -1){
      results[index] = res
    }
    index++
    if (index < count) {
      callback(index, next);
    } else {
      last(err, results);
    }
  }

  next()
}

const parallel = function (count, callback, last) {

  if (typeof count != 'number') {
    console.error('count is not number')
    return
  }

  if (typeof callback != 'function') {
    console.error('callback is not function')
    return
  }

  if (typeof last != 'function') {
    console.error('last is not function')
    return
  }

  var success = 0
  var error = 0
  var result = []

  if(count == 0){
    last("empty", null)
    return
  }

  for (var i = 0; i < count; i++){
    handleItem(i, callback)
  }

  function handleItem(index, callback){
    callback(index, function(err, value){
      if(err){
        error++
        if(error == 1){
          last("error")
        }
        return
      }

      result[index] = value
      success++
      if (success == count){
        last(null, result)
      }
    })
  }
}

/*
// for test serial
serial(5, function(index, callback){
  setTimeout(function(){
    var a = (Math.random() * 10).toFixed(0)
    console.log(index, "===>", a)
    //if (index == 1 || index == 3){
    //  callback("error")
    //}else{
      callback(null, a)
    //}
  }, 1000)
}, function(err, res){
  if(err){
    console.log("end", err)
  }else{
    console.log("end", res)
  }
})

// for test parallel
parallel(5, function (index, callback) {
  setTimeout(function () {
    var a = (Math.random() * 10).toFixed(0)
    console.log(index, "===>", a)
    //if(index == 1 || index == 3){
    // callback("error")
    //}else{
      callback(null, a)
    //}
  }, 1000 * Math.random())
}, function (err, res) {
  if(err){
    console.log("end", err)
  }else{
    console.log("end", res)
  }
})
*/

const default_data = {
  id: 12,
  name: "服装模版:限时包邮",
  image: "/portal/11/portal_12.jpg",
  icon: "/portal/11/portal_icon_12.jpg",
  config: {
    width: 750,
    height: 1000,
    color: 'white',
    backgrounds: [],
    rects: [{
      rect: [0, 0, 750, 1000]
    }],
    foregrounds: [{
      rect: [514, 0, 236, 194],
      color: 'white',
      image: {
        path: '/portal/12/bg_01.png',
        width: 236,
        height: 194
      }
    }, {
      rect: [0, 884, 750, 116],
      color: 'white',
      image: {
        path: '/portal/12/bg_02.png',
        width: 750,
        height: 116
      }
    }],
    texts: [{
      text: '冬季再优惠 8折再享满减',
      pos: [375, 905],
      size: 50,
      color: 'white',
      align: "center",
    }, {
      text: '12.21 上新',
      pos: [634, 13],
      size: 36,
      color: 'white',
      align: "center"
    }, {
      text: '限时包邮',
      pos: [634, 110],
      size: 38,
      color: 'white',
      align: "center"
    }]
  }
}

const deepCopy = function (source) {
  if (!source) return source
  var temp = JSON.stringify(source)
  return JSON.parse(temp)
}

module.exports = {
  formatTime: formatTime,
  host: "https://miniapp.dolphin.com/",
  serial: serial,
  parallel: parallel,
  default_data: default_data,
  deepCopy: deepCopy
}
