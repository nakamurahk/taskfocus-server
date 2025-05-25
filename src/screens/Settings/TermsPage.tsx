import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full px-6 py-6">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-600 hover:text-gray-800"
        >
          ← 戻る
        </button>
      </div>

      <div className="prose prose-sm max-w-none">
        <h1 className="text-xl font-bold mb-6">TaskFocus利用規約（β版・無料提供時）</h1>
        
        <p className="mb-6">
          この利用規約（以下「本規約」）は、個人開発者 Fitty2501（以下「運営者」といいます。）が提供するウェブアプリケーション「TaskFocus」（以下「本サービス」といいます。）の利用条件を定めるものです。本サービスは、現在β版として無料で提供されており、利用者は、本規約に同意することによって本サービスを利用できるものとします。
        </p>

        <h2 className="text-lg font-bold mt-8 mb-4">第1条（本サービスの内容）</h2>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>本サービスは、ADHD/ASDなどの発達特性に配慮したタスク管理を支援するウェブアプリケーションです。</li>
          <li>本サービスは、現在、無料かつ試験運用として提供されており、将来的に有償化される可能性や、提供形態が変更される場合があります。</li>
          <li>本サービスは医療行為ではなく、医学的診断、治療、医療相談の代替となるものではありません。健康上の問題や服薬に関するご質問については、必ず医療専門家にご相談ください。</li>
          <li>本サービスの薬効時間設定機能は、利用者の自己管理を支援するものであり、医師の処方や指導に代わるものではありません。</li>
        </ul>

        <h2 className="text-lg font-bold mt-8 mb-4">第2条（利用条件および免責事項）</h2>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>利用者は、利用者自身の判断と責任において本サービスを利用するものとします。</li>
          <li>運営者は、本サービスの機能、内容、提供条件等を変更、中断または終了する場合があります。重要な変更については、可能な限り事前に通知いたします。</li>
          <li>運営者は、本サービスの継続性、完全性、特定目的への適合性について、いかなる保証も行いません。</li>
          <li>本サービスはβ版として提供されており、不具合やデータ消失のリスクが存在します。運営者は、本サービスの利用により生じた不具合、データ消失、その他いかなる損害についても、一切の責任を負わないものとします。</li>
          <li>精神的な不調、予期せぬタスクの増減、データの誤表示など、本サービスの利用に起因または関連して利用者に生じたあらゆる損害について、運営者は一切の責任を負わないものとします。</li>
        </ul>

        <h2 className="text-lg font-bold mt-8 mb-4">第3条（利用者データおよび個人情報の取扱い）</h2>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>利用者が本サービスに入力したタスク内容等のデータは、本人のアカウントに紐づけて、運営者の管理するサーバー上に適切なセキュリティ対策を講じて保存されます。</li>
          <li>運営者は、利用者から個人を特定できる情報を基本的に収集しません。ただし、本サービスの利用状況分析や改善のため、匿名加工情報や統計情報としてデータを収集・利用する場合があります。</li>
          <li>運営者は、利用者データを第三者に提供することはありません。</li>
          <li>個人情報の具体的な取扱いについては、別途定めるプライバシーポリシーをご確認ください。</li>
        </ul>

        <h2 className="text-lg font-bold mt-8 mb-4">第4条（利用対象者）</h2>
        <p className="mb-6">未成年の方が本サービスを利用する場合は、保護者の方と相談の上でご利用ください。</p>

        <h2 className="text-lg font-bold mt-8 mb-4">第5条（禁止事項）</h2>
        <p className="mb-4">利用者は、本サービスの利用にあたり、以下の行為を行ってはならないものとします。</p>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>本サービスのサーバーまたはネットワークに過度な負担をかける行為</li>
          <li>営利目的での利用（個人の利用範囲を超えた商用利用）</li>
          <li>その他、運営者が不適切と判断する行為</li>
        </ul>

        <h2 className="text-lg font-bold mt-8 mb-4">第6条（著作権および知的財産権）</h2>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>本サービスのデザイン、プログラム、コンテンツ等に関する知的財産権は、運営者に帰属します。</li>
          <li>利用者は、本サービスを通じて提供されるいかなるコンテンツも、権利者の許諾を得ることなく、著作権法で定める私的利用の範囲を超えて利用することはできません。</li>
        </ul>

        <h2 className="text-lg font-bold mt-8 mb-4">第7条（アカウントの削除）</h2>
        <p className="mb-6">利用者は、いつでもアカウントの削除を申請することができます。削除されたデータの復旧はできません。</p>

        <h2 className="text-lg font-bold mt-8 mb-4">第8条（本規約の変更）</h2>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>運営者は、利用者への事前の通知により、本規約を変更することがあります。サービス終了など重要な変更の場合は、適切な期間をもって事前通知いたします。</li>
          <li>変更後の内容は本サービス内または運営者の公式媒体にて周知します。</li>
          <li>本規約の変更後、利用者が本サービスを利用した場合、変更後の本規約に同意したものとみなします。</li>
          <li>最新版の本規約は、本サービス内または運営者の公式ウェブサイト等でご確認ください。</li>
        </ul>

        <h2 className="text-lg font-bold mt-8 mb-4">第9条（準拠法および紛争解決）</h2>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
          <li>本サービスに関して紛争が生じた場合には、日本の法律に従い、当事者間での話し合いによる解決を優先します。</li>
        </ul>

        <h2 className="text-lg font-bold mt-8 mb-4">第10条（連絡方法）</h2>
        <p className="mb-6">本サービスに関する運営者への連絡は、本サービス内に設置されたお問い合わせフォームまたは運営者が指定する方法によるものとします。</p>

        <h2 className="text-lg font-bold mt-8 mb-4">第11条（その他）</h2>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>本規約の一部が無効または執行不能と判断された場合でも、その他の部分の効力には影響しません。</li>
          <li>本規約は公開日から施行されます。</li>
        </ul>

        <div className="mt-8 text-sm text-gray-600">
          <p>制定日：[2025/05/25]</p>
          <p>最終更新：[2025/05/25]</p>
        </div>
      </div>
    </div>
  );
};

export default TermsPage; 