ポリモーフィズムの利用機会を見逃さない
====

著者: カーク・ペパーディーン　(Kirk Pepperdine)

「ポリモーフィズム」は、オブジェクト指向の基礎を成す重要な概念です。元々はギリシャ語で「多数」を意味する"poly"と「形」を意味する"morph"に由来します。プログラミングにおいてポリモーフィズムとは、同じクラスのオブジェクトやメソッドが複数の形(form)を取り得るということを意味します。しかしポリモーフイズムは、ただ単に実装が複数になるということを意味しているのではありません。ポリモーフイズムをうまく使えば、オブジェクトやメソッドの特性、動きを、コンテキストに応じて細かく変えることができます。

しかも、そのために冗長なif-then-elseブロックを書く必要がないのです。そのかわり、コンテキストによってオブジェクトやメソッドが自動的に形を変えるためには、「このコンテキストならこのオブジェクト、あるいはメソッドを使う」というコードをあらかじめコンテキストの外で書いておく必要があります。ポリモーフィズムを有効に活かせば、その分コードの量が滅り、読みやすくなります。そのメリットがよくわかるコード例(実用的なものとは言えませんが…)を1つ見てみましょう。シンプルなショッピングカートのコードです。

```java
public class ShoppingCart {
    private ArrayList<Item> cart = new ArrayList<Item>();
    public void add(Item item) { cart.add(item); }
    public Item takeNext() { return cart.remove(0); }
    public boolean isEmpty() { return cart.isEmpty(); }
}
```

仮に、このWebショップでは、ダウンロードできる商品と、物理的な配送を必要とする商品の両方を扱っているとしましょう。それに対応するためには、たとえば次のようなクラスを作ることになります。

```java
public class Shipping {
    public boolean ship(Item item, SurfaceAddress address) {...}
    public boolean ship(Item item, EMailAddress address) {...}
}
```

顧客が注文手続きを済ませたら、次のコードで商品のダウンロード、あるいは配送を開始します。

```java
while (!cart.isEmpty()) {
shipping.ship(cart.takeNext(), ???);
}
```

"???"という部分は、実際にこう書くわけではありません(こういう演算子が本当にあるわけではありません) 。ここは、コンテキストによって、eメールアドレスか配送先の住所が入るはずのところです。つまり上記の例では、実際にどちらを入れるのかを決めるコード、つまりコンテキストを決めるコードが足りないということになります。booleanやenumと、if-then-elseブロックを使えば、このパラメータに入る値は決定できます。他には、Itemを継承するクラスを2つ作るという方法も考えられます。ここでは、その2つのクラスにDownloadableItem、SurfaceItemという名前をつけることにしましょう。それぞれのコードは次のとおりです。この場合、Itemは正確にはクラスではなくインタフェースで、shipというメソッドを1つ持っています。ショッピングカートに入った商品が出荷される際には`item.ship(shipper)`が呼び出されます。Downloadableltem、SurfaceItemという2つのクラスではいずれもこのshipメソッドを実装しています。

```java
public class DownloadableItem implements Item {
    public boolean shop(Shipping shipper, Customer customer) {
        shipper.ship(this, customer.getEmailAddress());
    }
}
public class SurfaceItem implements Item{
    public boolean ship(Shipping shipper, Customer customer) {
        shipper.ship(this, customer, getSurfaceAddress());
    }
}
```

この例では、Shippingクラスのshipメソッドを呼び出す仕事をItemクラスに委譲しています。物理的に配送すればいいのか、ダウンロードの方がいいのかという指定はItemクラスが自動的にするので、if-then-elseブロックを書かなくても、商品ごとに適切な出荷ができます。上記のコードは、CommandパターンとDouble Dispatchパターンという2つのパターンの使用例でもあります。この2つは、組み合わせて使うと効果的なことが多いパターンです。2つのパターンを組み合わせる上で重要になるのが、ポリモーフィズムをうまく利用することで、す。それができれば、if-then-elseブロックの数を減らすことがで、きるのです。

もちろん、ポリモーフイズムを利用するより、if-then-elseブロックを使った方が良いという場合も時にはあります。しかし、ポリモーフイズムを利用する方が、コードが読みやすく、またバグも少なくなる可能性が高いのです。コードの中に今、if-then-elseブロックになっている箇所があるのなら、そのすべてについてポリモーフイズムが使えないか検討した方が良い、と言ってもいいでしょう。

---

出典: [ウィキソース「プログラマが知るべき97のこと/ポリモーフィズムの利用機会を見逃さない」](https://ja.wikisource.org/w/index.php?oldid=60211)。Kevlin Henney 編、和田卓人 監修、夏目大 訳『プログラマが知るべき97のこと』（オライリー・ジャパン、2010年）。このエッセイは [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/deed.ja) のもとで提供されています。掲載にあたり、体裁を Markdown に変換しています。
