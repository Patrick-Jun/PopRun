// pages/user/user.js
const app = getApp();
import Notify from '@vant/weapp/notify/notify';
import Dialog from '@vant/weapp/dialog/dialog';
Page({

  /**
   * 页面的初始数据
   */
  data: {
    user: {
      img: "/imgs/default/girl.jpg"
    },  //用户数据
    unreadMessagesNum: 0, //未读信息
    isUnsigned: true,  //未注册
    medals: [],
    isShowSettingMenu: false, //设置菜单
    isShowProtocol: false,    //用户协议
    cacheSize: '0kB',         //缓存
    isShowloading: false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    //初始化页面数据
    this.initData();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    // app.checkUser()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    app.updateNotices({read: 0, type: 0}).then(({system})=>{
        this.setData({
            unreadMessagesNum: system
        })
    })
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.initData();
  },

  initData: function() {
    // 初始化用户数据
    // let user = that.getUserInfoFromLocal();
    //初始化：获取用户数据
    this.getUserData();
    //初始化：缓存数据
    this.setCacheSize();
  },

  /**
   * 跳转
   */
  //跳转到用户编辑页面
  goToEdit: function(){
    let that = this;
    let user = that.data.user;
    wx.navigateTo({
      url: 'edit/edit',
      events: {
        // 获取被打开页面传送到当前页面的数据
        whenUpdated: function(data) {
          // console.log('修改成功返回的数据',data)
          that.setData({ user: data })
          wx.setStorageSync('user', data);
        },
      },
      success: (res)=>{
        res.eventChannel.emit('getDataFromUserPage', user)
      },
      fail: ()=>{},
      complete: ()=>{}
    });
  },
  //跳转到用户预览页面
  goToPreview: function(){
    let that = this;
    let user = that.data.user;
    user.honors = that.data.honors;
    user.medals = that.data.medals;
    wx.navigateTo({
      url: 'userPage/userPage',
      success: (res)=>{
        res.eventChannel.emit('getDataFromUserPage', user)
      },
      fail: ()=>{},
      complete: ()=>{}
    });
  },
  //跳转到消息页面：系统消息
  goToSystemMessage: function(){
    let user = wx.getStorageSync('user');
    if(user){
        if(user.constructor != Object) user = JSON.parse(user);
        wx.navigateTo({
            url: '/pages/moments/messages/messages?rid='+user.rid+'&type=userCenter',
            fail: (err)=>{
              console.log(err)
            },
            complete: ()=>{}
        });
    }
  },

  //跳转到我的动态页面
  goToMyMoments: function(){
    let user = app.getUser();
    wx.navigateTo({
      url: 'myMoments/myMoments',
      success: (res)=>{
        res.eventChannel.emit('getDataFromUserPage', user)
      },
      fail: ()=>{},
      complete: ()=>{}
    });
  },
  
  //跳转到我的运动页面
  goToMyRuns: function(){
    let user = app.getUser();
    wx.navigateTo({
      url: 'myRuns/myRuns?rid='+user.rid,
      success: (res)=>{},
      fail: ()=>{},
      complete: ()=>{}
    });
  },

  //从服务器获取：判断是否注册、本地缓存
  getUserData: function(){
    let that = this;
    that.setData({
        isShowloading: true
    });
    app.getOpenid().then(res => {
      let openid = res;
      wx.request({
        url: app.config.getHostUrl() + '/api/user/getUser',
        method: 'post',
        data: {
          openid: openid
        },
        success: function (res) {
          if (res.statusCode == 200) {
            if (res.data.isSuccess) {
              that.updateCurrentUser(res.data.data);
              that.setData({isUnsigned: false});
              wx.setStorageSync('user', JSON.stringify(res.data.data));
              // 获取勋章称号
              that.getUserAll(res.data.data.rid);
              // Notify({ type: 'success', message: "刷新成功" });
            } else {
              // 未注册情况
              that.setData({isUnsigned: true})
              Notify({ type: 'danger', message: "您还未注册" });
            }
          } else {
            // 服务器故障
          }
        },
        fail: function (res) {
          // 请求错误
        },
        complete: function (){
          that.setData({
              isShowloading: false
          });
          app.stopRefresh();  //停止刷新状态的显示
        }
      })
    })
  },

  /**
   * 注册并获取用户信息
   */
  getUserInfo: function(e){
    let that = this;
    app.getOpenid().then(  //获取openid，不需要授权
      (data) => {
        let userData = {
          openid: data,   //openid
          nickname: e.detail.userInfo.nickName,  //昵称
          sex: e.detail.userInfo.gender,  //性别
          img: e.detail.userInfo.avatarUrl  //头像
        };
        //跑鸭注册
        wx.request({
          url: app.config.getHostUrl()+'/api/main/wxAuth',
          method: 'post',
          data: userData,
          success: (res) => {
            if(res.data.isSuccess){
              //注册成功处理逻辑
              console.log(res.data)
              // 获取勋章称号
              // that.getUserAll(res.data.data.rid);
              that.setData({
                medals_count: res.data.data.medals.length,
                honors: res.data.data.honors instanceof Array ? res.data.data.honors[0] : res.data.data.honors,
                medals: that.parseMedals(res.data.data.medals),
                isUnsigned: false
              });
              let user = {...res.data.data};
              delete user.honors;
              delete user.medals;
              that.updateCurrentUser(user);
              wx.setStorageSync('user', JSON.stringify(user));
            }else{
              // 注册失败
              console.log(res.data.msg)
            }
          },
          fail: (res) => {
            // 请求失败
          }
        })
    });
  },

  // 从本地获取用户数据
  getUserInfoFromLocal: function () {
    let user = wx.getStorageSync('user');
    if (user) {
      return JSON.parse(user);
    } else return false;
  },

  // 更新用户显示数据
  updateCurrentUser: function (data) {
    if (data) {
      this.setData({ user: data });
    }
  },

  // 获取已获称号
  getHonors: function(rid){
    let that = this;
    let user = that.data.user;
    wx.request({
      url: app.config.getHostUrl()+'/api/user/getHonor',
      method: 'post',
      data: { rid },
      success: (res) => {
        if(res.data.isSuccess){
          user.honors = res.data.data instanceof Array ? res.data.data : [res.data.data];
          that.setData({ user });
        }
      }
    })
  },

  // 获取已获勋章
  getMedals: function(rid){
    let that = this;
    let user = that.data.user;
    wx.request({
      url: app.config.getHostUrl()+'/api/user/getMedal',
      method: 'post',
      data: { rid },
      success: (res) => {
        if(res.data.isSuccess){
          user.medals = res.data.data instanceof Array ? res.data.data : [res.data.data];
          that.setData({ user });
        }
      }
    })
  },

  // 获取勋章称号等数据
  getUserAll: function (rid) {
    let that = this;
    wx.request({
      url: app.config.getHostUrl() + '/api/user/getUserAll',
      method: 'post',
      data: {
        rid: rid
      },
      success: function (res) {
        if (res.statusCode == 200) {
          if (res.data.isSuccess) {
            that.setData({
              medals_count: res.data.data.medals.length,
              honors: res.data.data.honors instanceof Array ? res.data.data.honors[0] : res.data.data.honors,
              medals: that.parseMedals(res.data.data.medals),
            });
          }
        } else {
          // 服务器故障
        }
      },
      fail: function (res) {
        // 请求错误
      }
    })
  },

  // 处理勋章数据
  parseMedals: function (medals) {
    if(medals == []) return medals;
    let nmedals = [];
    for (let i = 0; i < medals.length; i++) {
      if (medals[i] == undefined) continue;
      let outer = medals[i];
      let item = [outer]; //内循收集
      for (let n = i + 1; n < medals.length; n++) {
        if (outer.type == 0) break;
        if (medals[n] == undefined) continue;
        let inner = medals[n];
        if (outer.meid == inner.meid) {
          item.push(inner);
          delete medals[n];  //用splice不行，因为n的最大值在循环开始就确定了
        }
      }
      nmedals.push(item);
    }
    return nmedals;
  },

  /** 
   * 设置方法
   */
  // 关闭一些弹窗
  onClose: function(){
    this.setData({
      isShowSettingMenu: false,  // 关闭菜单弹窗
      isShowProtocol: false,     // 关闭用户协议
    })
  },

  // 显示设置菜单
  showSettingMenu: function(){
    this.setData({
      isShowSettingMenu: true
    })
  },

  // 展示用户协议
  showProtocol: function(){
    this.setData({
      isShowProtocol: true
    })
  },

  // 查询并设置缓存数据
  setCacheSize: function(){
    let that = this;
    wx.getStorageInfo({
      success (res) {
        that.setData({
          cacheSize: res.currentSize+"KB"
        })
        // console.log(res.limitSize)
      }
    })
  },

  // 清除缓存
  cleanCache: function(){
    let that = this;
    Dialog.confirm({
      title: '提示',
      zIndex: 200,  //设置的popup弹窗是100
      message: '清除缓存数据，只会清除您本地的数据，并不会删除您在我们服务器上的数据'
    }).then(() => {
      // on confirm
      wx.clearStorageSync();
      that.setCacheSize();
    }).catch(() => {
      // on cancel
    });
  },

})
