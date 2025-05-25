import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPage: React.FC = () => {
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
        <h1 className="text-xl font-bold mb-6">プライバシーポリシー（β版・無料提供時）</h1>
        <h2 className="text-lg font-bold mb-4">TaskFocusにおける利用者情報の取扱いについて</h2>
        
        <p className="mb-6">
          開発者Fitty2501（以下「運営者」といいます。）は、運営者が提供するウェブアプリケーション「TaskFocus」（以下「本サービス」といいます。）における利用者情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。
        </p>

        <p className="mb-6">
          本サービスは現在β版として提供されており、本ポリシーもβ版の運用方針に基づいています。利用者は、本サービスを利用することにより、本ポリシーの内容に同意したものとみなします。
        </p>

        <h2 className="text-lg font-bold mt-8 mb-4">第1条（収集する利用者情報）</h2>
        <p className="mb-4">本サービスでは、本サービスの提供および改善に必要な範囲で、以下の利用者情報を取得する場合があります。</p>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>タスクデータ: 利用者が本サービスに入力したタスクの内容、カテゴリ、期限、優先度、ハードルレベル、メモなどの情報</li>
          <li>利用状況に関する情報: 本サービスの利用履歴、タスクの完了記録、集中モードの利用時間、画面遷移などの操作履歴</li>
          <li>アクセス情報: ページビュー、セッション時間などの統計情報（Google Analyticsを使用）</li>
          <li>その他サービス提供上必要な情報: 上記の他、本サービスの提供にあたり運営者が必要と判断した情報</li>
        </ul>

        <p className="mb-6">
          ※ <strong>本サービスでは、利用者を特定する情報（氏名、住所、電話番号、メールアドレスなど）は一切収集しておりません。</strong> 収集する情報は、統計分析やサービス改善に利用可能な匿名化された情報、またはサービス機能上必要なデータに限られます。
        </p>

        <p className="mb-6">
          Google Analyticsについて: 本サービスでは、アクセス統計のためGoogle Analyticsを使用しています。個人を特定できない形で利用状況を分析し、サービス改善に活用します。
        </p>

        <h2 className="text-lg font-bold mt-8 mb-4">第2条（利用者情報の利用目的）</h2>
        <p className="mb-4">運営者は、収集した利用者情報を、以下の目的のために利用します。</p>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>本サービスのタスク管理機能、集中モード、アナリティクス機能などの提供、運用、維持のため</li>
          <li>本サービスの改善、新機能の開発、および品質向上のための統計分析および利用状況の調査のため</li>
          <li>本サービスの不具合、クラッシュ、障害などの原因を特定し、対処するため</li>
          <li>利用者からのお問い合わせに対応するため</li>
        </ul>

        <h2 className="text-lg font-bold mt-8 mb-4">第3条（利用者情報の第三者提供）</h2>
        <p className="mb-6">運営者は、収集した利用者情報を第三者に提供することはありません。</p>

        <h2 className="text-lg font-bold mt-8 mb-4">第4条（利用者情報の管理）</h2>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>運営者は、収集した利用者情報を適切かつ厳重に管理し、情報の漏洩、滅失、毀損の防止に努めます。また、不正アクセス対策やセキュリティ対策を講じ、利用者情報の安全性を確保します。</li>
          <li>利用者がアカウントを削除した場合、関連データは速やかに削除されます。</li>
        </ul>

        <h2 className="text-lg font-bold mt-8 mb-4">第5条（利用者によるデータの開示、訂正、削除等）</h2>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>利用者は、本サービスを通じて入力したタスクデータについて、ご自身で削除できる機能を利用できます。</li>
          <li>利用者ご自身の情報に関して、開示、訂正、削除、利用停止等をご希望される場合は、次条に定めるお問い合わせ窓口までご連絡ください。運営者は、合理的な範囲で速やかに対応いたします。</li>
        </ul>

        <h2 className="text-lg font-bold mt-8 mb-4">第6条（お問い合わせ窓口）</h2>
        <p className="mb-6">
          本ポリシーに関するお問い合わせ、または利用者データの開示、訂正、削除等のご要望は、本サービス内に記載された連絡先にお願いします。
        </p>

        <h2 className="text-lg font-bold mt-8 mb-4">第7条（本ポリシーの改定）</h2>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>運営者は、利用者への事前の通知により、本ポリシーを改定できるものとします。</li>
          <li>本ポリシーの変更後、利用者が本サービスを利用した場合、変更後の本ポリシーに同意したものとみなします。</li>
          <li>変更後の本ポリシーは、本サービス内または運営者の公式ウェブサイト等に掲載された時点から効力を生じるものとします。</li>
        </ul>

        <div className="mt-8 text-sm text-gray-600">
          <p>制定日：[2025/05/25]</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage; 