# Graph Report - C:\Users\ASUS\Documents\fintu-tracking  (2026-06-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1329 nodes · 3108 edges · 75 communities (68 shown, 7 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 167 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1f78f42d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Cash Flow UI|Cash Flow UI]]
- [[_COMMUNITY_Landing Page|Landing Page]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_Go Analytics Types|Go Analytics Types]]
- [[_COMMUNITY_Analytics Service Core|Analytics Service Core]]
- [[_COMMUNITY_Performance Time Series|Performance Time Series]]
- [[_COMMUNITY_Performance UI Cards|Performance UI Cards]]
- [[_COMMUNITY_Portfolio Health  FX|Portfolio Health / FX]]
- [[_COMMUNITY_FX Rate Data|FX Rate Data]]
- [[_COMMUNITY_Auth & Input Components|Auth & Input Components]]
- [[_COMMUNITY_Cash Flow Filters|Cash Flow Filters]]
- [[_COMMUNITY_Go Models|Go Models]]
- [[_COMMUNITY_Exchange Rate Service|Exchange Rate Service]]
- [[_COMMUNITY_Fee & Reconciliation|Fee & Reconciliation]]
- [[_COMMUNITY_Fee Attribution Charts|Fee Attribution Charts]]
- [[_COMMUNITY_Dashboard Holdings|Dashboard Holdings]]
- [[_COMMUNITY_Trade List Page|Trade List Page]]
- [[_COMMUNITY_Analytics Reports|Analytics Reports]]
- [[_COMMUNITY_Refresh & Table UI|Refresh & Table UI]]
- [[_COMMUNITY_Trade Query & Export|Trade Query & Export]]
- [[_COMMUNITY_Twelve Data Service|Twelve Data Service]]
- [[_COMMUNITY_Analytics API Surface|Analytics API Surface]]
- [[_COMMUNITY_Net Worth UI|Net Worth UI]]
- [[_COMMUNITY_Trade Dialog UI|Trade Dialog UI]]
- [[_COMMUNITY_Cash Flow Queries|Cash Flow Queries]]
- [[_COMMUNITY_CSV Export  Trade CRUD|CSV Export / Trade CRUD]]
- [[_COMMUNITY_Reconciliation Dashboard|Reconciliation Dashboard]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_shadcnui Utilities|shadcn/ui Utilities]]
- [[_COMMUNITY_Cash Flow Mutations|Cash Flow Mutations]]
- [[_COMMUNITY_Database Pool & Cash|Database Pool & Cash]]
- [[_COMMUNITY_Trade List Backend|Trade List Backend]]
- [[_COMMUNITY_Trade CRUD Backend|Trade CRUD Backend]]
- [[_COMMUNITY_HAPI Deposit Flow|HAPI Deposit Flow]]
- [[_COMMUNITY_Date Picker Components|Date Picker Components]]
- [[_COMMUNITY_Trade Filter UI|Trade Filter UI]]
- [[_COMMUNITY_Frontend Aliases|Frontend Aliases]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_Return Attribution Charts|Return Attribution Charts]]
- [[_COMMUNITY_Holdings Backend|Holdings Backend]]
- [[_COMMUNITY_Date Range Pickers|Date Range Pickers]]
- [[_COMMUNITY_Trade Edit Logic|Trade Edit Logic]]
- [[_COMMUNITY_Main Server Bootstrap|Main Server Bootstrap]]
- [[_COMMUNITY_Realized P&L Backend|Realized P&L Backend]]
- [[_COMMUNITY_Performance Chart UI|Performance Chart UI]]
- [[_COMMUNITY_Activity Feed Backend|Activity Feed Backend]]
- [[_COMMUNITY_Pagination Utilities|Pagination Utilities]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Package Scripts|Package Scripts]]
- [[_COMMUNITY_XIRR Engine|XIRR Engine]]
- [[_COMMUNITY_Performance Page Shell|Performance Page Shell]]
- [[_COMMUNITY_App Root & Fonts|App Root & Fonts]]
- [[_COMMUNITY_Select Component|Select Component]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Analytics Handlers|Analytics Handlers]]
- [[_COMMUNITY_XIRR Utilities|XIRR Utilities]]
- [[_COMMUNITY_Holdings Engine|Holdings Engine]]
- [[_COMMUNITY_FX Impact Report|FX Impact Report]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 71|Community 71]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 136 edges
2. `GetPool()` - 32 edges
3. `Button()` - 31 edges
4. `GetUserID()` - 29 edges
5. `CashFlow` - 29 edges
6. `serverGet()` - 24 edges
7. `Card()` - 23 edges
8. `CardContent()` - 23 edges
9. `CardHeader()` - 22 edges
10. `CardTitle()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `Close()`  [INFERRED]
  backend/cmd/api/main.go → backend/internal/database/db.go
- `main()` --calls--> `Connect()`  [INFERRED]
  backend/cmd/api/main.go → backend/internal/database/db.go
- `main()` --calls--> `InitExchangeRateService()`  [INFERRED]
  backend/cmd/api/main.go → backend/internal/handlers/fx_rates.go
- `GetActivityFeed()` --calls--> `GetPool()`  [INFERRED]
  backend/internal/handlers/activity.go → backend/internal/database/db.go
- `recomputeTransferNetUSD()` --calls--> `GetPool()`  [INFERRED]
  backend/internal/handlers/cash_flow_net_usd.go → backend/internal/database/db.go

## Import Cycles
- None detected.

## Communities (75 total, 7 thin omitted)

### Community 0 - "Cash Flow UI"
Cohesion: 0.05
Nodes (39): ActivityItem, getActivityFeed(), getCashFlowTypeLabel(), getFeeAttributionLabel(), isMirroredTradeFeeRow(), computeNetUsdAfterFee(), findLinkedDepositFee(), EditCashFlowDialogProps (+31 more)

### Community 1 - "Landing Page"
Cohesion: 0.06
Nodes (32): FintuLogo(), FintuLogoProps, GET(), landingDisplay, useCountUp(), LandingAtmosphere(), LandingAtmosphereProps, DemoStep (+24 more)

### Community 2 - "Frontend Dependencies"
Cohesion: 0.04
Nodes (55): dependencies, autoprefixer, class-variance-authority, clsx, cmdk, date-fns, decimal.js, embla-carousel-react (+47 more)

### Community 3 - "Go Analytics Types"
Cohesion: 0.07
Nodes (44): Time, T, Context, Decimal, T, Ctx, T, T (+36 more)

### Community 4 - "Analytics Service Core"
Cohesion: 0.09
Nodes (46): Decimal, Decimal, Decimal, T, Decimal, Context, AnalyticsService, Context (+38 more)

### Community 5 - "Performance Time Series"
Cohesion: 0.11
Nodes (33): Context, Decimal, performanceActivity, PerformancePoint, AnalyticsService, Time, performanceActivity, T (+25 more)

### Community 6 - "Performance UI Cards"
Cohesion: 0.10
Nodes (24): MetricLabel(), StatCell(), listCashFlowsForExport(), NetWorthCardProps, NetWorthData, PerformanceCharts, PerformanceContent(), PerformanceContentProps (+16 more)

### Community 7 - "Portfolio Health / FX"
Cohesion: 0.09
Nodes (21): FxRateChartPoint, invalidateAfterMutation(), invalidatePortfolioCaches(), queryKeys, AlertIcon, PortfolioHealthBanner(), severityStyles, { mockAlerts } (+13 more)

### Community 8 - "FX Rate Data"
Cohesion: 0.09
Nodes (17): CreateFxRateData, CurrentRateResponse, fetchCurrentRate(), FetchCurrentRateParams, FxRateChartPoint, getFxRateChart(), UpdateFxRateData, ConvertLastEdited (+9 more)

### Community 9 - "Auth & Input Components"
Cohesion: 0.18
Nodes (12): MoneyHeroInput(), MoneyHeroInputProps, ResetPasswordContent(), createClient(), Card(), CardContent(), CardDescription(), CardHeader() (+4 more)

### Community 10 - "Cash Flow Filters"
Cohesion: 0.12
Nodes (19): invalidateAfterCashFlowMutation, CURRENCY_OPTIONS, TYPE_OPTIONS, DeleteCashFlowDialog(), DeleteCashFlowDialogProps, FilterSelect(), LandingNavMobile(), LandingNavMobileProps (+11 more)

### Community 11 - "Go Models"
Cohesion: 0.09
Nodes (28): T, Time, ActivityItem, AnalyticsQuery, CashFlow, CreateCashFlowRequest, CreateFxRateRequest, CreateTradeRequest (+20 more)

### Community 12 - "Exchange Rate Service"
Cohesion: 0.14
Nodes (17): Client, Context, Pool, Time, InitExchangeRateService(), RWMutex, NewExchangeRateService(), parseChartDate() (+9 more)

### Community 13 - "Fee & Reconciliation"
Cohesion: 0.15
Nodes (20): Context, Decimal, Pool, Time, T, Time, FeeBreakdown, ReconciliationReport (+12 more)

### Community 14 - "Fee Attribution Charts"
Cohesion: 0.10
Nodes (18): FEE_TYPE_COLORS, FeeAttributionChart(), FeeTooltip(), FeeTooltipPayload, formatCurrency(), MUTED_CURSOR, feeBreakdownFixture, mockApiGet (+10 more)

### Community 15 - "Dashboard Holdings"
Cohesion: 0.12
Nodes (20): getHoldings(), listMarketPrices(), ActivityFeed(), DashboardQuickTrade(), DashboardQuickTradeProps, QuickTradeTarget, formatPriceAsOf(), HoldingsTable() (+12 more)

### Community 16 - "Trade List Page"
Cohesion: 0.14
Nodes (20): listTradeTickers(), cashFlowFiltersToSearchParams(), TradesPage(), TradesPageProps, applyTradeDatePreset(), calendarDayFromDate(), DEFAULT_TRADE_FILTERS, filterTrades() (+12 more)

### Community 17 - "Analytics Reports"
Cohesion: 0.15
Nodes (21): AnalyticsDateRange, FxImpactReport, getFeeBreakdown(), getFeeEfficiency(), getFxImpact(), getFxRateChart(), getPerformanceTimeSeries(), getReturnAttribution() (+13 more)

### Community 18 - "Refresh & Table UI"
Cohesion: 0.13
Nodes (15): FeeEfficiencyTickerRow, refreshMarketPrices(), RefreshPricesButton(), RefreshPricesButtonProps, SortableHeaderProps, SortDirection, SortKey, Table() (+7 more)

### Community 19 - "Trade Query & Export"
Cohesion: 0.13
Nodes (18): PaginatedResult, buildTradesQuery(), listTrades(), listTradesForExport(), listTradesPaginated(), mockServerGet, TradeListQueryParams, buildTradesQuery() (+10 more)

### Community 20 - "Twelve Data Service"
Cohesion: 0.15
Nodes (15): Client, Context, Pool, T, M, quoteResponse, RefreshResult, NewTwelveDataService() (+7 more)

### Community 21 - "Analytics API Surface"
Cohesion: 0.16
Nodes (16): buildDateRangeSearchParams(), FeeEfficiencyData, getFeeBreakdown(), getFeeEfficiency(), getFxImpact(), getFxRateChart(), getNetWorth(), getPerformanceTimeSeries() (+8 more)

### Community 22 - "Net Worth UI"
Cohesion: 0.14
Nodes (15): formatUsd(), getPeriodConfig(), METRIC_TOOLTIPS, NetWorthCard(), baseNetWorth, mockApiGet, items, TimePeriod (+7 more)

### Community 23 - "Trade Dialog UI"
Cohesion: 0.13
Nodes (13): getHoldings(), getMarketPrice(), PerformanceMetrics, RefreshResult, AddTradeDialog(), AddTradeDialogProps, SellTickerSelect(), Dialog() (+5 more)

### Community 24 - "Cash Flow Queries"
Cohesion: 0.17
Nodes (16): buildCashFlowsQuery(), listCashFlows(), listCashFlowsForExport(), listCashFlowsPaginated(), CashFlowCurrencyFilter, cashFlowFiltersToApiParams(), CashFlowListQueryParams, CashFlowTypeFilter (+8 more)

### Community 25 - "CSV Export / Trade CRUD"
Cohesion: 0.16
Nodes (12): cashFlowsToCsv(), cell(), CSV_HEADERS, downloadCashFlowsCsv(), Trade, DeleteTradeDialog(), DeleteTradeDialogProps, EditTradeDialogProps (+4 more)

### Community 26 - "Reconciliation Dashboard"
Cohesion: 0.14
Nodes (13): ReconciliationDashboard(), ReconciliationIssue, ReconciliationReport, mockApiGet, reconciledReport, unreconciledReport, Alert(), AlertDescription() (+5 more)

### Community 27 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 28 - "shadcn/ui Utilities"
Cohesion: 0.11
Nodes (18): cn(), TradeTickerFilter(), AlertDialogFooter(), AlertDialogOverlay(), CalendarDayButton(), CardAction(), CardFooter(), CommandDialog() (+10 more)

### Community 29 - "Cash Flow Mutations"
Cohesion: 0.20
Nodes (10): createCashFlow(), CreateCashFlowData, deleteCashFlow(), updateCashFlow(), UpdateCashFlowData, feeTypeForCashFlowType(), parsePositiveFee(), showToast (+2 more)

### Community 30 - "Database Pool & Cash"
Cohesion: 0.25
Nodes (17): Pool, Ctx, Pool, AnalyticsService, GetPool(), DateRange, GetCashReconciliation(), GetFeeBreakdown() (+9 more)

### Community 31 - "Trade List Backend"
Cohesion: 0.19
Nodes (17): Context, Trade, Time, T, Time, tradeListFilters, appendTradeListFilters(), buildCountTradesQuery() (+9 more)

### Community 32 - "Trade CRUD Backend"
Cohesion: 0.22
Nodes (16): Ctx, Decimal, Time, T, applyLegacyFeeToTrading(), CreateTrade(), DeleteTrade(), ListTradeTickers() (+8 more)

### Community 33 - "HAPI Deposit Flow"
Cohesion: 0.16
Nodes (11): AddCashFlowDialog(), EditCashFlowDialog(), normalizeNetUsd(), depositCashFlow, computeCopFromNetUsd(), computeHapiDepositBreakdown(), HapiCopFromNetUsdInput, HapiDepositBreakdown (+3 more)

### Community 34 - "Date Picker Components"
Cohesion: 0.17
Nodes (14): canNavigateToNextMonth(), canNavigateToPreviousMonth(), DatePickerDayHeaderProps, DatePickerDayHeaderWithNav(), DatePickerDayHeaderWithNavProps, getDatePickerYearRange(), MONTH_NAMES, MonthGridPicker() (+6 more)

### Community 35 - "Trade Filter UI"
Cohesion: 0.24
Nodes (12): invalidateAfterTradeMutation, ASSET_OPTIONS, SIDE_OPTIONS, Command(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem() (+4 more)

### Community 36 - "Frontend Aliases"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 37 - "Dev Dependencies"
Cohesion: 0.11
Nodes (18): devDependencies, eslint, @eslint/js, jsdom, postcss, tailwindcss, @tailwindcss/postcss, @testing-library/jest-dom (+10 more)

### Community 38 - "Return Attribution Charts"
Cohesion: 0.16
Nodes (13): AttributionTooltipRow, buildWaterfallSteps(), formatPercent(), formatUsd(), FX_IMPACT_THRESHOLD, MUTED_CURSOR, ReturnAttribution(), attributionFixture (+5 more)

### Community 39 - "Holdings Backend"
Cohesion: 0.23
Nodes (11): Context, Decimal, Holding, AnalyticsService, Time, T, holdingPosition, computeHoldingsFromTrades() (+3 more)

### Community 40 - "Date Range Pickers"
Cohesion: 0.19
Nodes (12): CashFlowFilters, parseCalendarDay(), toCalendarDay(), DateRangePicker(), DateRangePickerProps, PRESETS, TradeDateFilter(), TradeDateFilterProps (+4 more)

### Community 41 - "Trade Edit Logic"
Cohesion: 0.28
Nodes (11): formatCalendarDate(), toDateInputValue(), EditTradeDialog(), tradeToFormValues(), buildTradePayload(), calculateTradeTotal(), sumTradeFees(), baseFormValues (+3 more)

### Community 42 - "Main Server Bootstrap"
Cohesion: 0.19
Nodes (11): main(), Close(), Connect(), Handler, InitTwelveDataService(), AuthMiddleware(), getSupabasePublicKey(), refreshJWKSCache() (+3 more)

### Community 43 - "Realized P&L Backend"
Cohesion: 0.18
Nodes (11): Context, Decimal, AnalyticsService, Time, Decimal, T, positionLot, sellProceeds() (+3 more)

### Community 44 - "Performance Chart UI"
Cohesion: 0.21
Nodes (8): PerformanceInterval, PerformancePoint, hasSpySeries(), INTERVAL_OPTIONS, PortfolioPerformanceChart(), mockGetPerformanceTimeSeries, timeSeriesFixture, toChartData()

### Community 45 - "Activity Feed Backend"
Cohesion: 0.28
Nodes (11): Ctx, Ctx, Ctx, GetActivityFeed(), CreateFxRate(), DeleteFxRate(), GetCurrentRate(), GetFxRateChart() (+3 more)

### Community 46 - "Pagination Utilities"
Cohesion: 0.29
Nodes (10): CashFlowsPage(), clampPage(), mergePageSearchParams(), PAGE_SIZE_OPTIONS, PageParams, parsePageParams(), parsePageSize(), parsePositiveInt() (+2 more)

### Community 48 - "Package Scripts"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, dev, lint, start, test (+2 more)

### Community 49 - "XIRR Engine"
Cohesion: 0.44
Nodes (9): Context, Decimal, Pool, Time, calculateXIRR(), solveXIRR(), xnpv(), xnpvDerivative() (+1 more)

### Community 50 - "Performance Page Shell"
Cohesion: 0.31
Nodes (5): NetWorthSummary, getNetWorth(), PerformanceLoading(), PerformancePage(), Skeleton()

### Community 51 - "App Root & Fonts"
Cohesion: 0.28
Nodes (5): geist, geistMono, metadata, Providers(), Toaster()

### Community 52 - "Select Component"
Cohesion: 0.50
Nodes (5): Select(), SelectContent(), SelectItem(), SelectTrigger(), SelectValue()

### Community 54 - "Analytics Handlers"
Cohesion: 0.48
Nodes (6): Ctx, GetHoldings(), GetMarketPrice(), GetPerformance(), ListMarketPrices(), RefreshMarketPrices()

### Community 55 - "XIRR Utilities"
Cohesion: 0.52
Nodes (6): Decimal, Time, CashFlowForXIRR, calculateNPVAndDerivative(), CalculateXIRR(), yearsBetween()

### Community 56 - "Holdings Engine"
Cohesion: 0.50
Nodes (4): Holding, Trade, CalculateHoldings(), UpdateHoldingsWithPrices()

### Community 57 - "FX Impact Report"
Cohesion: 0.50
Nodes (3): Context, AnalyticsService, FXImpactReport

## Knowledge Gaps
- **297 isolated node(s):** `fintu-tracking-backend`, `Pool`, `Ctx`, `DateRange`, `T` (+292 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `shadcn/ui Utilities` to `Cash Flow UI`, `Landing Page`, `Date Picker Components`, `Trade Filter UI`, `Performance UI Cards`, `Date Range Pickers`, `Auth & Input Components`, `Cash Flow Filters`, `Fee Attribution Charts`, `Refresh & Table UI`, `Performance Page Shell`, `Select Component`, `Net Worth UI`, `Trade Dialog UI`, `Reconciliation Dashboard`, `Cash Flow Mutations`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `NewFeeService()` connect `Database Pool & Cash` to `Fee & Reconciliation`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `assertSQLFragments()` connect `Analytics Service Core` to `Fee & Reconciliation`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `GetPool()` (e.g. with `GetActivityFeed()` and `GetCashReconciliation()`) actually correct?**
  _`GetPool()` has 30 INFERRED edges - model-reasoned connections that need verification._
- **Are the 27 inferred relationships involving `GetUserID()` (e.g. with `GetActivityFeed()` and `GetCashReconciliation()`) actually correct?**
  _`GetUserID()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **What connects `fintu-tracking-backend`, `Pool`, `Ctx` to the rest of the system?**
  _297 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Cash Flow UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05480769230769231 - nodes in this community are weakly interconnected._