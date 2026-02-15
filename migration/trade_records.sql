--
-- PostgreSQL database dump
--

\restrict kOTmu6oQQkv239LcCbRq3r1jJQ1LgqcVu7T7G91UeNZVpbygJgijcLdgqOrlDBE

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
-- Data for Name: trade_records; Type: TABLE DATA; Schema: public; Owner: alpha
--

COPY public.trade_records (id, agent_id, trade_date, ts_code, name, trade_type, volume, price, amount, commission, tax, transfer_fee, total_cost, realized_pnl, pnl_pct, decision_reason, thinking_chain, confidence, status, created_at) FROM stdin;
1	buffett	2026-02-13	603402.SH	陕西旅游	BUY	1000	148.5000	148500.00	0.00	0.00	0.00	\N	\N	\N	\N	\N	\N	FILLED	2026-02-15 15:34:12.116448
2	buffett	2026-02-13	300641.SZ	正丹股份	BUY	2000	19.6100	39220.00	0.00	0.00	0.00	\N	\N	\N	\N	\N	\N	FILLED	2026-02-15 15:34:12.116448
3	soros	2026-02-13	300449.SZ	汉邦高科	BUY	3000	9.1800	27540.00	0.00	0.00	0.00	\N	\N	\N	\N	\N	\N	FILLED	2026-02-15 15:34:12.116448
4	soros	2026-02-13	300812.SZ	易天股份	BUY	1000	41.7600	41760.00	0.00	0.00	0.00	\N	\N	\N	\N	\N	\N	FILLED	2026-02-15 15:34:12.116448
5	simons	2026-02-13	002456.SZ	欧菲光	BUY	2000	9.8000	19600.00	0.00	0.00	0.00	\N	\N	\N	\N	\N	\N	FILLED	2026-02-15 15:34:12.116448
6	simons	2026-02-13	600252.SH	中恒集团	BUY	5000	2.5300	12650.00	0.00	0.00	0.00	\N	\N	\N	\N	\N	\N	FILLED	2026-02-15 15:34:12.116448
\.


--
-- Name: trade_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alpha
--

SELECT pg_catalog.setval('public.trade_records_id_seq', 6, true);


--
-- PostgreSQL database dump complete
--

\unrestrict kOTmu6oQQkv239LcCbRq3r1jJQ1LgqcVu7T7G91UeNZVpbygJgijcLdgqOrlDBE

