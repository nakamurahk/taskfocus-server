  {showTerms && (
    <div className="terms-container">
      <div className="terms-header">
        <button onClick={() => setShowTerms(false)} className="back-button">
          <span className="material-icons">arrow_back</span>
          <span>戻る</span>
        </button>
        <h2>利用規約</h2>
      </div>
    </div>
  )}

  {showPrivacy && (
    <div className="terms-container">
      <div className="terms-header">
        <button onClick={() => setShowPrivacy(false)} className="back-button">
          <span className="material-icons">arrow_back</span>
          <span>戻る</span>
        </button>
        <h2>プライバシーポリシー</h2>
      </div>
    </div>
  )} 