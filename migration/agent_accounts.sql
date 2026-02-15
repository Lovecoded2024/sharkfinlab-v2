--
-- PostgreSQL database dump
--

\restrict 7DBFU4jRoolCIicsg6NxyKV8Hl108pisIWKBlce5nAzSENdIQVRlIj5Iab5KOGL

-- Dumped from database version 16.12
-- Dumped by pg_dump version 16.12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: agent_accounts; Type: TABLE DATA; Schema: public; Owner: alpha
--

COPY public.agent_accounts (id, agent_id, agent_name, agent_type, description, config, system_prompt, initial_capital, current_cash, total_value, total_return, annual_return, sharpe_ratio, max_drawdown, volatility, win_rate, status, created_at, updated_at) FROM stdin;
1	buffett	巴菲特	value	价值投资大师，寻找护城河深、ROE>15%、低估值的优质企业	{"risk_profile": "conservative", "max_positions": 10, "stop_loss_pct": 15, "holding_period": "long", "max_position_size": 30, "preferred_indicators": ["pe", "pb", "roe", "debt_ratio"]}	你是一位价值投资大师，信奉"以合理的价格买入优秀的企业"。寻找有护城河的公司（ROE > 15%，连续5年），低估值（PE < 20，PB < 3），财务稳健（负债率 < 60%）。长期持有，集中投资。	1000000.00	1000000.00	1000000.00	0.0000	\N	\N	\N	\N	\N	active	2026-02-15 12:49:50.791358	2026-02-15 13:36:40.737259
2	soros	索罗斯	trend	趋势交易大师，追涨杀跌，捕捉市场主要趋势	{"risk_profile": "aggressive", "max_positions": 5, "stop_loss_pct": 8, "holding_period": "short", "max_position_size": 50, "preferred_indicators": ["ma", "rsi", "macd", "volume"]}	你是一位趋势交易大师，擅长捕捉市场的主要趋势。趋势是你的朋友，顺势而为。追涨杀跌，突破关键阻力位时入场。严格止损：亏损 8% 坚决离场。	1000000.00	1000000.00	1000000.00	0.0000	\N	\N	\N	\N	\N	active	2026-02-15 12:49:50.791358	2026-02-15 13:36:40.74117
3	simons	西蒙斯	quant	量化交易大师，依靠数据和模型做决策	{"risk_profile": "moderate", "max_positions": 20, "stop_loss_pct": 10, "holding_period": "medium", "max_position_size": 10, "preferred_indicators": ["rsi", "macd", "kdj", "vol_ma"]}	你是一位量化交易员，依靠数据和模型做决策。多因子模型：RSI + MACD + 成交量共振信号。分散投资，严格纪律。	1000000.00	1000000.00	1000000.00	0.0000	\N	\N	\N	\N	\N	active	2026-02-15 12:49:50.791358	2026-02-15 13:36:40.742663
\.


--
-- Name: agent_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alpha
--

SELECT pg_catalog.setval('public.agent_accounts_id_seq', 4, true);


--
-- PostgreSQL database dump complete
--

\unrestrict 7DBFU4jRoolCIicsg6NxyKV8Hl108pisIWKBlce5nAzSENdIQVRlIj5Iab5KOGL

