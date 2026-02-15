--
-- PostgreSQL database dump
--

\restrict qhnyMpANcQJX3qtq4zcAk88VswyXBBWOy17zsrb18p5H5huzQcF6LnAam7WwSwU

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
-- Data for Name: daily_nav; Type: TABLE DATA; Schema: public; Owner: alpha
--

COPY public.daily_nav (id, agent_id, trade_date, nav, total_value, cash, market_value, daily_return, daily_pnl, cumulative_return, position_count, position_ratio, created_at) FROM stdin;
\.


--
-- Name: daily_nav_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alpha
--

SELECT pg_catalog.setval('public.daily_nav_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict qhnyMpANcQJX3qtq4zcAk88VswyXBBWOy17zsrb18p5H5huzQcF6LnAam7WwSwU

