declare const wx: any;
declare const App: any;
declare const Page: any;
declare const Component: any;
declare function getApp<T = any>(): T;

declare namespace WechatMiniprogram {
  interface AppOption {
    globalData: {
      env: string;
    };
  }
}
