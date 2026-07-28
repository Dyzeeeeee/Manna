# Graph Report - .  (2026-07-29)

## Corpus Check
- 98 files · ~134,791 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1145 nodes · 2340 edges · 93 communities (69 shown, 24 thin omitted)
- Extraction: 87% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 292 edges (avg confidence: 0.68)
- Token cost: 283,860 input · 0 output

## Community Hubs (Navigation)
- Instant Data Layer & Auth
- Tiswell Package Dependencies
- Prototype Screen Logic
- Local Store & Capture
- Money Domain Calculations
- Tiswell Blueprint & Deploy Config
- Anthropic SDK Message Streaming
- Tiswell TypeScript App Config
- Icon & Category Editor UI
- Wrangler Enrollment & Heartbeat
- Add Sheet Composer Flow
- Plan Screen & Rule Editors
- Home Screen & Balance Card
- SDK Stream Decoding
- Core Domain Types
- Manna TypeScript Config
- SDK Client Credentials
- SDK Request Middleware & Retry
- Node Build TypeScript Config
- Natural-Language Parse Module
- Worker TypeScript Config
- Owed Screen & Debt Forms
- Manna PWA Shell & Identity
- OIDC Token Refresh Provider
- Worker Parse Endpoint
- Shared Database & Roadmap Bets
- Manna Dev Dependencies
- Tiswell App Shell & Link Apps
- SDK Agent Tool Definitions
- Transaction & Debt Data Model
- Category Rules & Excluded Scope
- Tiswell Brand Icon Assets
- SDK Message Parsing
- Wrangler Middleware Facade
- SDK Tool & File Helpers
- SDK Request Serialization
- Settings Screen & Build Stamp
- Add Flow & Currency Constraints
- Manna Brand Icon Assets
- SDK Pagination
- Plan, Allotments & Recurring
- Manna Runtime Dependencies
- Manna Package Identity
- Voice Capture Box
- Tiswell Capture Store
- Manna NPM Scripts
- App URL Naming Helpers
- Month Screen & Speed Bar
- Manna Icon Generator Script
- Tiswell Icon Generator Script
- Tile Component
- SDK File Uploads
- SDK Query Stringify
- Category Deletion Open Question
- Button Component
- Relative Time Helper
- Manna Vite Config
- Worker Taxonomy Helpers
- Tiswell Product Framing
- Tiswell Env Types
- Tiswell Home Screen
- Mini-App Registry
- Tiswell Settings Screen
- Sheet Component
- Tiswell Root TSConfig
- SDK Identity Token Providers
- lucide-react Dependency
- react Dependency
- react-dom Dependency
- tailwindcss Dependency
- @types/node Dependency
- @types/react-dom Dependency
- typescript Dependency
- vite Dependency
- vite-plugin-pwa Dependency
- @vitejs/plugin-react Dependency
- Wrangler Middleware Facade Stub
- SDK Backoff Helpers
- Wrangler Facade Invoke
- SDK Request Cleanup
- Info Icon

## God Nodes (most connected - your core abstractions)
1. `__classPrivateFieldGet()` - 49 edges
2. `buildHeaders()` - 43 edges
3. `constructor()` - 29 edges
4. `Wallet` - 27 edges
5. `Category` - 26 edges
6. `findCategory()` - 26 edges
7. `accentOf()` - 22 edges
8. `glyphOf()` - 22 edges
9. `Txn` - 21 edges
10. `compilerOptions` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Search and date range filter` --conceptually_related_to--> `monthSummary`  [INFERRED]
  ROADMAP.md → src/money.ts
- `Amounts stored as integer centavos` --shares_data_with--> `monthSummary`  [INFERRED]
  README.md → src/money.ts
- `Month screen (in / out / net)` --references--> `monthSummary`  [INFERRED]
  README.md → src/money.ts
- `Wallets screen (balance per wallet)` --references--> `walletBalances()`  [INFERRED]
  README.md → src/money.ts
- `Savings goals` --references--> `walletBalances()`  [EXTRACTED]
  ROADMAP.md → src/money.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **The transfer-exclusion invariant (what must never count as spending)** — claude_transaction_kind, readme_transfer_kind, claude_debt, claude_owed_excluded_from_spendable, roadmap_debts, src_money_monthsummary, src_money_walletbalances [INFERRED 0.85]
- **The four category rules and the icon system that makes two levels sufficient** — claude_two_level_rule, claude_parent_count_rule, claude_optional_subcategory_rule, claude_merchant_rule, claude_icon_resolution, claude_icon_catalogue, claude_category [EXTRACTED 1.00]
- **Natural-language capture flow: sentence to confirmed transaction** — worker_readme_manna_parse, worker_readme_post_contract, worker_readme_shared_parse_module, worker_readme_add_draft, claude_add_sheet, worker_readme_app_token, worker_readme_anthropic_key [EXTRACTED 1.00]
- **Manna add-and-log flow** — manna_prototype_openadd, manna_prototype_press, manna_prototype_paint, manna_prototype_renderquick, manna_prototype_logit, manna_prototype_addtx, manna_prototype_offerundo [EXTRACTED 1.00]
- **One reminder source, two surfaces** — manna_prototype_notifs, manna_prototype_active, manna_prototype_renderstrips, manna_prototype_rendernotifs, manna_prototype_nrow, manna_prototype_renderall [EXTRACTED 1.00]
- **Tiswell/Manna shared-database stack** — tiswell_tiswell_blueprint_instant_schema, tiswell_tiswell_blueprint_instant_perms, tiswell_tiswell_blueprint_mirror, tiswell_tiswell_blueprint_instant, tiswell_tiswell_blueprint_handshake, tiswell_tiswell_blueprint_migrate, tiswell_tiswell_blueprint_tiswelldata [EXTRACTED 1.00]
- **Manna PWA Icon Asset Family (one vector, three renders)** — public_icons_mark_manna_mark, public_icons_icon_192_pwa_icon_192, public_icons_icon_512_pwa_icon_512, public_icons_maskable_512_maskable_icon, public_icons_maskable_512_pwa_installability_asset_set [INFERRED 0.85]
- **Manna Mark Visual Language (arcs, earth tones, uniform stroke)** — public_icons_mark_nested_arcs_motif, public_icons_mark_earth_tone_palette, public_icons_mark_stroke_only_construction, public_icons_mark_manna_mark [EXTRACTED 1.00]
- **Tiswell PWA Manifest Icon Set** — tiswell_public_icons_icon_192_pwa_icon_192, tiswell_public_icons_icon_512_pwa_icon_512, tiswell_public_icons_maskable_512_maskable_icon, tiswell_public_icons_logo_app_logo, tiswell_public_icons_mark_concentric_arc_mark [INFERRED 0.85]
- **Tiswell Brand Identity System** — tiswell_tiswell_logo_lockup, tiswell_tiswell_wordmark, tiswell_public_icons_mark_concentric_arc_mark, tiswell_public_icons_mark_earth_tone_palette, tiswell_public_icons_mark_smile_arc_motif [INFERRED 0.85]

## Communities (93 total, 24 thin omitted)

### Community 0 - "Instant Data Layer & Auth"
Cohesion: 0.05
Nodes (33): _AppSchema, _schema, AuthGate(), parentOrigins, isMessage(), requestAuthFromParent(), serveAuthToFrames(), useDataReady() (+25 more)

### Community 1 - "Tiswell Package Dependencies"
Cohesion: 0.04
Nodes (48): fake-indexeddb, react-router-dom, dependencies, dexie, @instantdb/react, lucide-react, react, react-dom (+40 more)

### Community 2 - "Prototype Screen Logic"
Cohesion: 0.06
Nodes (49): active, addTx, ALLOT (allotment caps), buildOwed, Built-in numpad instead of the system keyboard, colorOf, Debt payment logged as a transfer, not spending, Frequency-ranked quick-log grid (+41 more)

### Community 3 - "Local Store & Capture"
Cohesion: 0.09
Nodes (39): captureConfigured, CaptureResult, env, localDate(), parseSentence(), Manna(), Tab, tabs (+31 more)

### Community 4 - "Money Domain Calculations"
Cohesion: 0.09
Nodes (32): BaseTxn, Categorised, categoryAccent(), categoryBreakdown(), CategoryGlyph, categorySpend(), CategoryTotal, daysOnList() (+24 more)

### Community 5 - "Tiswell Blueprint & Deploy Config"
Cohesion: 0.06
Nodes (40): Manna dark palette custom properties, Spendable grand total excludes money owed, Tiswell HTML entry document, Quicksand + Nunito Sans web font load, Exhale mark favicon and apple-touch-icon, Paired light/dark theme-color meta tags, onlyBuiltDependencies allowlist (esbuild, sharp), pnpm command surface (+32 more)

### Community 6 - "Anthropic SDK Message Streaming"
Cohesion: 0.09
Nodes (40): aborted(), _addMessage(), _addMessageParam(), arm(), asResponse(), __classPrivateFieldGet(), __classPrivateFieldSet(), close() (+32 more)

### Community 7 - "Tiswell TypeScript App Config"
Cohesion: 0.05
Nodes (36): instant.perms.ts, instant.schema.ts, ./src/data/*, ./src/miniapps/*, ./src/shell/*, ./src/ui/*, vite/client, compilerOptions (+28 more)

### Community 8 - "Icon & Category Editor UI"
Cohesion: 0.10
Nodes (30): accentBg, AmountProps, CategoryIcon(), tile, WalletIcon(), byOrder(), CategoryEditor(), CategoryForm() (+22 more)

### Community 9 - "Wrangler Enrollment & Heartbeat"
Cohesion: 0.08
Nodes (34): ack(), apiKeyAuth(), applyJitter(), archive(), authHeaders(), bearerAuth(), buildHeaders(), createEnrollmentURL() (+26 more)

### Community 11 - "Add Sheet Composer Flow"
Cohesion: 0.10
Nodes (22): AddComposer(), AddSheet(), AmountPanel(), flowFor(), initialStep(), kinds, Step, CategoryPicker() (+14 more)

### Community 12 - "Plan Screen & Rule Editors"
Cohesion: 0.18
Nodes (24): CategorySummary(), accentOf(), findCategory(), formatMoney(), glyphOf(), parentOf(), ConsideringCard(), Expected() (+16 more)

### Community 13 - "Home Screen & Balance Card"
Cohesion: 0.12
Nodes (23): Amount(), BalanceCard(), BalanceCardProps, FilterChips(), options, greeting(), Home(), Icon (+15 more)

### Community 14 - "SDK Stream Decoding"
Cohesion: 0.10
Nodes (28): abort(), [(_BetaMessageStream_currentMessageSnapshot = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_params = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_connectedPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_resolveConnectedPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_rejectConnectedPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_endPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_resolveEndPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_rejectEndPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_listeners = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_ended = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_errored = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_aborted = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_catchingPromiseCreated = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_response = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_request_id = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_logger = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_handleError = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_instances = /* @__PURE__ */ new WeakSet(), _BetaMessageStream_getFinalMessage = /* @__PURE__ */ __name(function _BetaMessageStream_getFinalMessage2() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    return this.receivedMessages.at(-1);
  }, "_BetaMessageStream_getFinalMessage"), _BetaMessageStream_getFinalText = /* @__PURE__ */ __name(function _BetaMessageStream_getFinalText2() {
    if (this.receivedMessages.length === 0) {
      throw new AnthropicError("stream ended without producing a Message with role=assistant");
    }
    const textBlocks = this.receivedMessages.at(-1).content.filter((block) => block.type === "text").map((block) => block.text);
    if (textBlocks.length === 0) {
      throw new AnthropicError("stream ended without producing a content block with type=text");
    }
    return textBlocks.join(" ");
  }, "_BetaMessageStream_getFinalText"), _BetaMessageStream_beginRequest = /* @__PURE__ */ __name(function _BetaMessageStream_beginRequest2() {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, void 0, "f");
  }, "_BetaMessageStream_beginRequest"), _BetaMessageStream_addStreamEvent = /* @__PURE__ */ __name(function _BetaMessageStream_addStreamEvent2(event) {
    if (this.ended)
      return;
    const messageSnapshot = __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_accumulateMessage).call(this, event);
    this._emit("streamEvent", event, messageSnapshot);
    switch (event.type) {
      case "content_block_delta": {
        const content = messageSnapshot.content.at(-1);
        switch (event.delta.type) {
          case "text_delta": {
            if (content.type === "text") {
              this._emit("text", event.delta.text, content.text || "");
            }
            break;
          }
          case "citations_delta": {
            if (content.type === "text") {
              this._emit("citation", event.delta.citation, content.citations ?? []);
            }
            break;
          }
          case "input_json_delta": {
            if (tracksToolInput(content) && __classPrivateFieldGet(this, _BetaMessageStream_listeners, "f").inputJson?.length) {
              let jsonSnapshot;
              try {
                jsonSnapshot = content.input;
              } catch (err) {
                __classPrivateFieldGet(this, _BetaMessageStream_handleError, "f").call(this, __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_toolInputParseError).call(this, content, err));
                break;
              }
              this._emit("inputJson", event.delta.partial_json, jsonSnapshot);
            }
            break;
          }
          case "thinking_delta": {
            if (content.type === "thinking") {
              this._emit("thinking", event.delta.thinking, content.thinking);
            }
            break;
          }
          case "signature_delta": {
            if (content.type === "thinking") {
              this._emit("signature", content.signature);
            }
            break;
          }
          case "compaction_delta": {
            if (content.type === "compaction" && content.content) {
              this._emit("compaction", content.content);
            }
            break;
          }
          default:
            checkNever(event.delta);
        }
        break;
      }
      case "message_stop": {
        this._addMessageParam(messageSnapshot);
        this._addMessage(maybeParseBetaMessage(messageSnapshot, __classPrivateFieldGet(this, _BetaMessageStream_params, "f"), { logger: __classPrivateFieldGet(this, _BetaMessageStream_logger, "f") }), true);
        break;
      }
      case "content_block_stop": {
        this._emit("contentBlock", messageSnapshot.content.at(-1));
        break;
      }
      case "message_start": {
        __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, messageSnapshot, "f");
        break;
      }
      case "content_block_start":
      case "message_delta":
        break;
    }
  }, "_BetaMessageStream_addStreamEvent"), _BetaMessageStream_endRequest = /* @__PURE__ */ __name(function _BetaMessageStream_endRequest2() {
    if (this.ended) {
      throw new AnthropicError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
    if (!snapshot) {
      throw new AnthropicError(`request ended without sending any chunks`);
    }
    __classPrivateFieldSet(this, _BetaMessageStream_currentMessageSnapshot, void 0, "f");
    return maybeParseBetaMessage(snapshot, __classPrivateFieldGet(this, _BetaMessageStream_params, "f"), { logger: __classPrivateFieldGet(this, _BetaMessageStream_logger, "f") });
  }, "_BetaMessageStream_endRequest"), _BetaMessageStream_accumulateMessage = /* @__PURE__ */ __name(function _BetaMessageStream_accumulateMessage2(event) {
    let snapshot = __classPrivateFieldGet(this, _BetaMessageStream_currentMessageSnapshot, "f");
    if (event.type === "message_start") {
      if (snapshot) {
        throw new AnthropicError(`Unexpected event order, got ${event.type} before receiving "message_stop"`);
      }
      return event.message;
    }
    if (!snapshot) {
      throw new AnthropicError(`Unexpected event order, got ${event.type} before "message_start"`);
    }
    switch (event.type) {
      case "message_stop":
        return snapshot;
      case "message_delta":
        snapshot.container = event.delta.container;
        snapshot.stop_reason = event.delta.stop_reason;
        snapshot.stop_sequence = event.delta.stop_sequence;
        if (event.delta.stop_details != null) {
          snapshot.stop_details = event.delta.stop_details;
        }
        snapshot.usage.output_tokens = event.usage.output_tokens;
        snapshot.context_management = event.context_management;
        if (event.usage.input_tokens != null) {
          snapshot.usage.input_tokens = event.usage.input_tokens;
        }
        if (event.usage.cache_creation_input_tokens != null) {
          snapshot.usage.cache_creation_input_tokens = event.usage.cache_creation_input_tokens;
        }
        if (event.usage.cache_read_input_tokens != null) {
          snapshot.usage.cache_read_input_tokens = event.usage.cache_read_input_tokens;
        }
        if (event.usage.server_tool_use != null) {
          snapshot.usage.server_tool_use = event.usage.server_tool_use;
        }
        if (event.usage.iterations != null) {
          snapshot.usage.iterations = event.usage.iterations;
        }
        if (event.usage.fallback_credit != null) {
          snapshot.usage.fallback_credit = event.usage.fallback_credit;
        }
        return snapshot;
      case "content_block_start":
        snapshot.content.push(event.content_block);
        if (event.content_block.type === "fallback") {
          snapshot.model = event.content_block.to.model;
        }
        return snapshot;
      case "content_block_delta": {
        const snapshotContent = snapshot.content.at(event.index);
        switch (event.delta.type) {
          case "text_delta": {
            if (snapshotContent?.type === "text") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                text: (snapshotContent.text || "") + event.delta.text
              };
            }
            break;
          }
          case "citations_delta": {
            if (snapshotContent?.type === "text") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                citations: [...snapshotContent.citations ?? [], event.delta.citation]
              };
            }
            break;
          }
          case "input_json_delta": {
            if (snapshotContent && tracksToolInput(snapshotContent)) {
              const jsonBuf = (snapshotContent[JSON_BUF_PROPERTY] || "") + event.delta.partial_json;
              snapshot.content[event.index] = withLazyInput(snapshotContent, jsonBuf);
            }
            break;
          }
          case "thinking_delta": {
            if (snapshotContent?.type === "thinking") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                thinking: snapshotContent.thinking + event.delta.thinking
              };
            }
            break;
          }
          case "signature_delta": {
            if (snapshotContent?.type === "thinking") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                signature: event.delta.signature
              };
            }
            break;
          }
          case "compaction_delta": {
            if (snapshotContent?.type === "compaction") {
              snapshot.content[event.index] = {
                ...snapshotContent,
                content: (snapshotContent.content || "") + event.delta.content,
                encrypted_content: event.delta.encrypted_content
              };
            }
            break;
          }
          default:
            checkNever(event.delta);
        }
        return snapshot;
      }
      case "content_block_stop": {
        const snapshotContent = snapshot.content.at(event.index);
        if (snapshotContent && tracksToolInput(snapshotContent) && JSON_BUF_PROPERTY in snapshotContent) {
          let input;
          try {
            input = snapshotContent.input;
          } catch (err) {
            input = {};
            __classPrivateFieldGet(this, _BetaMessageStream_handleError, "f").call(this, __classPrivateFieldGet(this, _BetaMessageStream_instances, "m", _BetaMessageStream_toolInputParseError).call(this, snapshotContent, err));
          }
          Object.defineProperty(snapshotContent, "input", {
            value: input,
            enumerable: true,
            configurable: true,
            writable: true
          });
        }
        return snapshot;
      }
    }
  }, "_BetaMessageStream_accumulateMessage"), _BetaMessageStream_toolInputParseError = /* @__PURE__ */ __name(function _BetaMessageStream_toolInputParseError2(block, err) {
    const jsonBuf = block[JSON_BUF_PROPERTY];
    return new AnthropicError(`Unable to parse tool parameter JSON from model. Please retry your request or adjust your prompt. Error: ${err}. JSON: ${jsonBuf}`);
  }, "_BetaMessageStream_toolInputParseError"), Symbol.asyncIterator)](), cancel(), CancelReadableStream(), concatBytes(), decode(), decoder(), decodeUTF8() (+20 more)

### Community 15 - "Core Domain Types"
Cohesion: 0.14
Nodes (22): AddSheetProps, HomeProps, IconSkip, Allotment, Category, Considering, Debt, Recurring (+14 more)

### Community 16 - "Manna TypeScript Config"
Cohesion: 0.08
Nodes (25): dev, ../TisWell/src/data/*, ../TisWell/src/ui/*, compilerOptions, jsx, lib, module, moduleDetection (+17 more)

### Community 17 - "SDK Client Credentials"
Cohesion: 0.10
Nodes (26): _applyCredentialBaseURL(), applyMiddleware(), constructor(), copyClientForHelper(), createMiddlewareContext(), _credentialResolverOptions(), credentials(), _credentialsFetch() (+18 more)

### Community 18 - "SDK Request Middleware & Retry"
Cohesion: 0.11
Nodes (25): addRequestID(), armAbandonmentBackstop(), _authFlags(), backendMiddleware(), calculateDefaultRetryTimeoutMillis(), defaultParseResponse(), fetchWithTimeout(), get() (+17 more)

### Community 19 - "Node Build TypeScript Config"
Cohesion: 0.09
Nodes (21): ES2023, node, vitest.config.ts, compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection (+13 more)

### Community 20 - "Natural-Language Parse Module"
Cohesion: 0.16
Nodes (15): TxnKind, buildDraftSchema(), buildParsePrompt(), Confidence, ParsedDraft, sanitizeDraft(), categories, dining (+7 more)

### Community 21 - "Worker TypeScript Config"
Cohesion: 0.12
Nodes (16): @cloudflare/workers-types, index.ts, ../src/money.ts, ../src/parse.ts, compilerOptions, lib, module, moduleResolution (+8 more)

### Community 22 - "Owed Screen & Debt Forms"
Cohesion: 0.16
Nodes (16): IconApprove, IconDelete, debtBalance, debtPayments(), parseAmount(), DebtCard(), DebtForm(), Owed() (+8 more)

### Community 23 - "Manna PWA Shell & Identity"
Cohesion: 0.16
Nodes (15): Manna (personal stewardship log), Offline-first PWA constraint, Decision: Owed stays out of the spendable grand total, manna-prototype.html as visual reference, Wallets screen, Entry point /dev/main.tsx, Google Fonts (Nunito Sans, Quicksand), iOS standalone meta tags (+7 more)

### Community 24 - "OIDC Token Refresh Provider"
Cohesion: 0.26
Nodes (15): backgroundRefresh(), buildProvider(), cachedExchangeProvider(), catch(), checkCredentialsFileSafety(), doRefresh(), getToken(), nowAsSeconds() (+7 more)

### Community 25 - "Worker Parse Endpoint"
Cohesion: 0.14
Nodes (15): [(_BetaToolRunner_consumed = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_mutated = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_state = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_options = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_message = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_toolResponse = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_completion = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_iterationCount = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_instances = /* @__PURE__ */ new WeakSet(), _BetaToolRunner_checkAndCompact = /* @__PURE__ */ __name(async function _BetaToolRunner_checkAndCompact2() {
    const compactionControl = __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.compactionControl;
    if (!compactionControl || !compactionControl.enabled) {
      return false;
    }
    let tokensUsed = 0;
    if (__classPrivateFieldGet(this, _BetaToolRunner_message, "f") !== void 0) {
      try {
        const message = await __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
        const totalInputTokens = message.usage.input_tokens + (message.usage.cache_creation_input_tokens ?? 0) + (message.usage.cache_read_input_tokens ?? 0);
        tokensUsed = totalInputTokens + message.usage.output_tokens;
      } catch {
        return false;
      }
    }
    const threshold = compactionControl.contextTokenThreshold ?? DEFAULT_TOKEN_THRESHOLD;
    if (tokensUsed < threshold) {
      return false;
    }
    const model = compactionControl.model ?? __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.model;
    const summaryPrompt = compactionControl.summaryPrompt ?? DEFAULT_SUMMARY_PROMPT;
    const messages = __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages;
    if (messages[messages.length - 1].role === "assistant") {
      const lastMessage = messages[messages.length - 1];
      if (Array.isArray(lastMessage.content)) {
        const nonToolBlocks = lastMessage.content.filter((block) => block.type !== "tool_use");
        if (nonToolBlocks.length === 0) {
          messages.pop();
        } else {
          lastMessage.content = nonToolBlocks;
        }
      }
    }
    const response = await this.client.beta.messages.create({
      model,
      messages: [
        ...messages,
        {
          role: "user",
          content: [
            {
              type: "text",
              text: summaryPrompt
            }
          ]
        }
      ],
      max_tokens: __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.max_tokens
    }, {
      signal: __classPrivateFieldGet(this, _BetaToolRunner_options, "f").signal,
      headers: buildHeaders([__classPrivateFieldGet(this, _BetaToolRunner_options, "f").headers, helperHeader("compaction")])
    });
    if (response.content[0]?.type !== "text") {
      throw new AnthropicError("Expected text response for compaction");
    }
    __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages = [
      {
        role: "user",
        content: response.content
      }
    ];
    return true;
  }, "_BetaToolRunner_checkAndCompact"), Symbol.asyncIterator)](), buildDraftSchema(), corsHeaders(), countTokens(), create(), __facade_register__(), fetch(), findCategory() (+7 more)

### Community 26 - "Shared Database & Roadmap Bets"
Cohesion: 0.14
Nodes (14): Separate deployment, shared Tiswell database, Decision: to-buys here, to-sells in Tiswell, Tiswell embedded tile and postMessage session handshake, finances namespace prefix convention, First-run seeding with fixed ids, Shared InstantDB app as storage, Budgets per category per month, Generic records table (ns, recordId, item) (+6 more)

### Community 27 - "Manna Dev Dependencies"
Cohesion: 0.15
Nodes (13): @cloudflare/workers-types, devDependencies, @cloudflare/workers-types, @remixicon/react, sharp, @tailwindcss/vite, @types/react, vitest (+5 more)

### Community 28 - "Tiswell App Shell & Link Apps"
Cohesion: 0.18
Nodes (6): App(), Shell(), isLinkAppOrigin(), LinkApp, oldestFirst(), useLinkApps()

### Community 29 - "SDK Agent Tool Definitions"
Cohesion: 0.29
Nodes (13): betaAgentToolset20260401(), betaBashTool(), betaEditTool(), betaGlobTool(), betaGrepTool(), betaReadTool(), betaWriteTool(), extractSkillArchive() (+5 more)

### Community 30 - "Transaction & Debt Data Model"
Cohesion: 0.23
Nodes (12): Build order (v1 / v1.1 / v1.5 / later), Debt (data model), Formal English copy constraint, Owed screen, Transaction (data model), Transaction kind (in / out / transfer), Wallet (data model), Transfer as a first-class kind (+4 more)

### Community 31 - "Category Rules & Excluded Scope"
Cohesion: 0.21
Nodes (12): Category (parent + optional subcategory), Central icon catalogue keyed by stable strings, Icon resolution order (sub name, parent, fallback), Category Rule 4: merchants are never subcategories, Decision: no bank sync, Decision: no God/Others/Needs/Wants split, Out of scope list, SMS / notification capture as the automation path (+4 more)

### Community 32 - "Tiswell Brand Icon Assets"
Cohesion: 0.27
Nodes (12): Tiswell PWA Icon 192px, Opaque Cream Field Instead of Transparency, Tiswell PWA Icon 512px, Tiswell In-App Logo, Centred Scale Transform Crop, Tiswell Concentric Arc Mark, Tiswell Earth-Tone Palette, Smile Arc Motif (+4 more)

### Community 33 - "SDK Message Parsing"
Cohesion: 0.23
Nodes (12): finally(), getOutputFormat(), getOutputFormat2(), maybeParseBetaMessage(), maybeParseMessage(), parse(), parseBetaMessage(), parseBetaOutputFormat() (+4 more)

### Community 34 - "Wrangler Middleware Facade"
Cohesion: 0.18
Nodes (7): __Facade_ScheduledController__, wrapExportedHandler(), methodRequest(), patch(), post(), put(), request()

### Community 35 - "SDK Tool & File Helpers"
Cohesion: 0.24
Nodes (11): add(), applyToolChange(), applyToolReference(), availableToolNames(), block(), collectStainlessHelpers(), delete(), referencedToolName() (+3 more)

### Community 36 - "SDK Request Serialization"
Cohesion: 0.20
Nodes (11): buildBody(), buildRequest(), buildURL(), defaultQuery(), isEmptyObj(), makeReadableStream(), normalize_stringify_options(), ReadableStreamFrom() (+3 more)

### Community 37 - "Settings Screen & Build Stamp"
Cohesion: 0.22
Nodes (7): IconBack, IconSettings, Build(), builtLabel(), Settings(), Tab, TABS

### Community 38 - "Add Flow & Currency Constraints"
Cohesion: 0.25
Nodes (9): Add sheet (built-in numpad), Category Rule 2: parents stay at 8-12, PHP-only currency constraint, Amounts stored as integer centavos, Log screen (landing, built for speed), TxnSheet (edit sheet), Multi-currency support, Confirmation feedback after saving (+1 more)

### Community 39 - "Manna Brand Icon Assets"
Cohesion: 0.39
Nodes (9): PWA App Icon 192px, PWA App Icon 512px, Earth-Tone Brand Palette, Manna Mark (source vector), Nested Open-Arcs Motif, Stroke-Only, Round-Cap Construction, Maskable App Icon 512px, PWA Installability Icon Set (+1 more)

### Community 40 - "SDK Pagination"
Cohesion: 0.28
Nodes (9): [(_AbstractPage_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)](), getAPIList(), getNextPage(), getPaginatedItems(), hasNextPage(), iterPages(), maybeObj(), nextPageRequestOptions() (+1 more)

### Community 41 - "Plan, Allotments & Recurring"
Cohesion: 0.43
Nodes (8): Allotment (cap on a category), Decision: Giving is a normal parent category, Home screen, Plan screen, Recurring (template), Decision: recurring items are approved, not auto-logged, Settings screen, Recurring transactions that prompt, not auto-write

### Community 42 - "Manna Runtime Dependencies"
Cohesion: 0.29
Nodes (7): @anthropic-ai/sdk, dependencies, @anthropic-ai/sdk, dexie, @instantdb/react, dexie, @instantdb/react

### Community 43 - "Manna Package Identity"
Cohesion: 0.29
Nodes (6): main, name, packageManager, private, type, version

### Community 44 - "Voice Capture Box"
Cohesion: 0.29
Nodes (6): CaptureBox(), SpeechCtor, SpeechRecognitionLike, SpeechResultEvent, IconMic, IconSend

### Community 45 - "Tiswell Capture Store"
Cohesion: 0.33
Nodes (3): Capture, newestFirst(), useCaptures()

### Community 46 - "Manna NPM Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, icons, preview, test

### Community 47 - "App URL Naming Helpers"
Cohesion: 0.67
Nodes (4): detectAppName(), normalizeUrl(), titleToName(), urlToName()

### Community 48 - "Month Screen & Speed Bar"
Cohesion: 0.40
Nodes (5): The 5-second bar, Month screen, Category Rule 3: subcategory is optional, Month screen (in / out / net), Trends (sparkline, per-category over time)

### Community 49 - "Manna Icon Generator Script"
Cohesion: 0.50
Nodes (3): arc(), MARK, point()

### Community 50 - "Tiswell Icon Generator Script"
Cohesion: 0.50
Nodes (3): arc(), MARK, point()

### Community 51 - "Tile Component"
Cohesion: 0.40
Nodes (3): Accent, accentText, TileProps

### Community 52 - "SDK File Uploads"
Cohesion: 0.40
Nodes (5): getBytes(), getName(), makeFile(), propsForError(), toFile()

### Community 53 - "SDK Query Stringify"
Cohesion: 0.40
Nodes (5): inner_stringify(), is_buffer(), is_non_nullish_primitive(), maybe_map(), serializeDate()

### Community 54 - "Category Deletion Open Question"
Cohesion: 0.50
Nodes (4): Open question: moving a category between parents, Categories management screen (missing), Category deletion must not orphan references, removeCategory()

### Community 58 - "Worker Taxonomy Helpers"
Cohesion: 0.50
Nodes (4): buildParsePrompt(), parentCategories(), subcategoriesOf(), taxonomyFor()

### Community 59 - "Tiswell Product Framing"
Cohesion: 0.67
Nodes (3): tis.well (personal life-organizer PWA), Personal app store architecture, Tiswell (build blueprint)

### Community 67 - "SDK Identity Token Providers"
Cohesion: 0.67
Nodes (3): identityTokenFromFile(), identityTokenFromValue(), resolveIdentityTokenProvider()

## Ambiguous Edges - Review These
- `Offline-first PWA constraint` → `Google Fonts (Nunito Sans, Quicksand)`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to
- `Formal English copy constraint` → `Debts / utang with partial payments`  [AMBIGUOUS]
  ROADMAP.md · relation: conceptually_related_to
- `Centred Scale Transform Crop` → `Adaptive Icon Safe Zone Inset`  [AMBIGUOUS]
  TisWell/public/icons/mark.svg · relation: conceptually_related_to

## Knowledge Gaps
- **240 isolated node(s):** `_schema`, `name`, `private`, `version`, `type` (+235 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Offline-first PWA constraint` and `Google Fonts (Nunito Sans, Quicksand)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Formal English copy constraint` and `Debts / utang with partial payments`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Centred Scale Transform Crop` and `Adaptive Icon Safe Zone Inset`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `parentBreakdown()` connect `Money Domain Calculations` to `Instant Data Layer & Auth`, `Plan Screen & Rule Editors`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `row()` connect `Instant Data Layer & Auth` to `Money Domain Calculations`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `monthSummary` connect `Money Domain Calculations` to `Add Flow & Currency Constraints`, `Home Screen & Balance Card`, `Core Domain Types`, `Month Screen & Speed Bar`, `Transaction & Debt Data Model`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `constructor()` (e.g. with `credentials()` and `params()`) actually correct?**
  _`constructor()` has 4 INFERRED edges - model-reasoned connections that need verification._