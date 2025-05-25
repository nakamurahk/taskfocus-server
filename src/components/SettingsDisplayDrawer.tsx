                <h3 className="text-base font-semibold text-gray-700 mb-2 px-3 py-1.5 bg-gray-50 rounded-md">期限</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {['today', 'tomorrow'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCustomDue(customDue.includes(opt) ? customDue.filter(v => v !== opt) : [...customDue, opt])}
                        className={`flex-1 px-3 py-1 rounded-lg border text-sm font-medium cursor-pointer transition-colors duration-150 ${customDue.includes(opt) ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-blue-50'}`}
                      >
                        {opt === 'today' ? '今日' : '明日'}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {['within_week', 'within_month'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCustomDue(customDue.includes(opt) ? customDue.filter(v => v !== opt) : [...customDue, opt])}
                        className={`flex-1 px-3 py-1 rounded-lg border text-sm font-medium cursor-pointer transition-colors duration-150 ${customDue.includes(opt) ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-blue-50'}`}
                      >
                        {opt === 'within_week' ? '今週' : '今月'}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {['overdue', 'none'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCustomDue(customDue.includes(opt) ? customDue.filter(v => v !== opt) : [...customDue, opt])}
                        className={`flex-1 px-3 py-1 rounded-lg border text-sm font-medium cursor-pointer transition-colors duration-150 ${customDue.includes(opt) ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-blue-50'}`}
                      >
                        {opt === 'overdue' ? '期限切れ' : '期限なし'}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">※期限は1つしか選べません</div>
                </div> 