共有は慎重に
====

著者: Udi Dahan

それは私が社会に出て最初にかかわったプロジェクトでのことでした。まだ大学を出たてで、自分の能力を証明したくてしょうがなかった頃です。毎晩夜遅くまで会社に残り、既存のコードを読んで色々なことを学んでいました。そして、私は初めて仕事を任されたとき、担当部分の作業にこれまで自分の学んできたことをどうしても実践してみたくなったのです。それは、コメントを入れること、ログをとること、そして、内容が似通っているコードをできるだけライブラリ化することでした。しかし、意気揚々と臨んだコードレビューで私は思い知らされることになります。コードの再利用を安易に促進すると、かえってひんしゅくを買ってしまうのだ、ということを。

どうしてそういうことになったのでしょうか。大学では「再利用」を優れたソフトウェア開発プロジェクトの象徴として教わってきました。どんな論文や教科書を読んでもそう書いてあったし、経験豊かなプロのソフトウェア技術者もそう語っていたのに、それらは全部間違いだった、ということでしょうか。

考えた結果わかったのは、私が1つ重大なことを見逃していた、ということです。

それは「**コンテキスト**」です。

たとえシステム内に同様の処理を行う部分が2つあったとしても、両者のシステムにおける役割が大きく異なっていれば、再利用におけるメリットは小さいのです。私がコードをライブラリ化するまで、そのコードを利用する部分間に依存関係はまったくありませんでした。元々の成り立ちが全然違うコードだったのです。従って、状況やニーズが変われば、その後各部分のロジックにはまったく別の変更が必要になる可能性が高いということです。たとえコードが4行ほどのもので、行っていることが同じだったとしても、それはたまたま一時的にそうなっていただけのことです。私が入ってくるより前は、むしろ一致していない方が普通だったのです。

私がコードをライブラリ化してしまったことで、それを利用する部分には依存関係が生じました。まるで、一本の靴ひもを、両足の靴に通したような状態になったのです。ライブラリのコードを1行変更しただけで、その影響は複数箇所に飛びます。互いに独立していた時なら、該当部分の保守コストは無視できるほど小さかったのに、ライブラリ化してから、変更のたびに大変な手間をかけてテストをする必要が生じました。

私は、システムを構成するコードの絶対的な行数は減らしたのですが、依存し合う部分を増やしてしまったわけです。依存関係が生じる場合には、そのコンテキストが重要になります。依存関係が生じても、狭い範囲のことならば、さほど問題は生じず、共有のメリットの方が大きくなったでしょう。しかし、広範囲での依存関係が生じると、システムの様々な部分がそれに巻き込まれることになり、ライブラリのコード自体は良くできていても、デメリットの方が大きくなります。

こういうミスはとても厄介です。「再利用」は一般に良いこととされており、確かに基本的には良いことだからです。コンテキストさえ適切なら、間違いなく有効です。しかし、コンテキストが不適切だと、メリットよりもコストの方が大きくなるのです。私は今では、システム全体の構造がわからないうちは、コードの共有を安易に進めたりはしません。まずは部分同士の関係をよくみて、どこをライブラリ化すべきかを慎重に考えます。

「共有は慎重に。事前のコンテキスト確認を忘れずに」ということですね。