-- course_outlines: full extracted text of each course outline, keyed by course code
-- (matches data/courses.ts). The chatbot reads this from Supabase at query time, so
-- outlines can be edited without a redeploy. Outlines are not secret; any authenticated
-- user may read. Seeded below; re-running upserts.
CREATE TABLE IF NOT EXISTS course_outlines (
  code       text PRIMARY KEY,
  name       text NOT NULL,
  content    text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE course_outlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_outlines_read_auth" ON course_outlines
  FOR SELECT USING (auth.role() = 'authenticated');

INSERT INTO course_outlines (code, name, content) VALUES
  ('ABMK', 'Account Based Marketing', $OUTLINE_q9z$BITS SCHOOL OF MANAGEMENT
Term 4, 2026- 27
Course Outline

General Information:

Instructor: Prof. Piyush Kumar
Course Title: Account Based Marketing (ABM)
Contact details: brandyogee@yahoo.com

Prelude to Subject:
Account-based marketing (ABM) has become the new and preferred approach in business markets to align the sales and marketing functions, and to achieve top-line and bottom-line targets. Firms that have transitioned to the ABM model have seen multifold growth in their average contract values and dramatic improvements in their return on marketing investments.
Program Overview:
The program provides both, a broad overview, and the necessary details for an organization to complete
the transition to Account-based Marketing, which includes:
• The scope of Account-based Marketing
• The roles of data in ABM
• The tools and software to execute ABM successfully.
• The new role of branding in ABM
• A revised approach to customer selection, customer valuation, and customer journey
• Integration of content, digital strategies, public relations, events, and sales strategies
• Managing the internal disruption during the transition
• The revised role of KPIs, incentives, and job functions
Mode of Delivery:
The course will be delivered through a mix of lectures and case discussions. In addition, students will be individually running an online marketing simulation throughout the course. The purpose of the simulation is two-fold. It is primarily designed to synthesize the learnings from the course in an applied, simplified, setting. It also provides much of the learning concepts in a focused manner and serves as a substitute for a textbook.
Key Learnings for Participants:
This course will give a comprehensive view of the ABM process to get participants market ready as professionals in this growing field.This interactive program will enable participants to understand the principles of ABM and get a first-hand experience with the tools, frameworks, and methods to be able to successfully implement such a program in their organization. Using live examples, case studies, a simulation, and a project, participants will be equipped to help their organization seamlessly transition to ABM with minimal internal disruption and
external marketplace performance.
Participants will learn about the (1) strategic imperative for Account-based marketing in a business-to-business context, (2) the limitations of a sales funnel-based approach, (3) the relationship between ABM and a seamless customer journey, (4) the efficiency gains from a focused customer selection approach, (5) how to integrate marketing, sales, and digital strategy, (6) how to internally transform the organization to derive the greatest benefit from ABM.
Key Takeaways:
• Understand the role of marketing within a business.
• Develop the skills to craft marketing strategies and tactics.
• Learn how to integrate marketing with other business functions.
• Learn how to craft a comprehensive marketing plan.

Course Material Requirements:
There is no textbook for the course. The cases that we will use will be available as a case pack. In addition, you will individually run a web-based ABM simulation from precisedonline.com.
Assessment Parameters:
• Each student is expected to thoroughly prepare each assigned reading and case. You are then expected to participate in and contribute to every case discussion.
• You will also be assessed on your individual performance in the simulation.
• There will be an applied group project and your written submission and presentation will be
assessed for quality and comprehensiveness.
• You will be graded individually or in groups for the details and comprehensiveness of your assigned exercises.

Grading Parameters:
• Class Participation (Cases and attendance): 20%
• Short group exercises and presentations: 20%
• Online simulation: 30%
• Final Project and Presentation 30%

NOTE: Your final grade will be based on your overall rank within the class and not on absolute cutoffs.$OUTLINE_q9z$),
  ('SCAT', 'Supply Chain Analytics', $OUTLINE_q9z$BITS SCHOOL OF MANAGEMENT
Term 4, 2026-27
Course Outline
(Early draft; Tentative and subject to change)

Course Title: SUPPLY CHAIN ANALYTICS
Dates: June 29, 2026 – July 12, 2026

Faculty: Dr. Ravi Subramanian (Gregory J. Owens Professor of Operations Management, Georgia Tech)

Course Description (Tentative and subject to change)

This course develops a supply chain analytics mindset for managers. Using the Problem-Plan-Data-Analysis-Conclusions (PPDAC) cycle and the analytics maturity progression from descriptive to diagnostic, predictive, and prescriptive analytics, students learn how to convert operations and supply chain problems into structured managerial decisions.
The course is more application-driven than methods-driven, although we will talk about why a chosen method makes contextual sense. Students will build on prior coursework in business statistics and analytics. This course does not re-teach foundational analytical techniques; instead, it applies and extends them in a range of supply chain contexts such as sourcing, inventory, forecasting, visibility, production, warehousing, logistics, resilience, coordination, and sustainability.
A central objective of the course is to help students understand both the how and the why of analytics in operations. Students will work with real or simulated supply chain datasets, frame managerial questions, assess data quality, choose methods suitable for the decision context, interpret outputs, and communicate implications for action. JMP Pro Student Edition will be the primary software platform used for in-class work, quizzes, and the group project.
By the end of the course, students should be able to: (1) frame supply chain problems analytically; (2) distinguish when descriptive, diagnostic, predictive, and prescriptive approaches are appropriate; (3) analyze key supply chain performance metrics; (4) build and interpret basic forecasting, classification, clustering, simulation, and optimization models in a supply chain setting; and (5) present data-driven recommendations clearly using plain language and avoiding jargon.

Course Materials (Tentative and subject to change)

Course packet containing pre-reads, real or simulated datasets and related notes, and articles/cases posted before each class.
Session-specific articles from business press and practitioner sources used to motivate current supply chain challenges.
Assessment Components (Tentative and subject to change)

	•	Class Attendance/Participation: 30% (Individual and based primarily on objective aspects such as attendance, punctuality, and responses to polls, regardless of whether answers are correct).
	•	Quizzes: 30% (Individual) - Best 2 of 3 quizzes count.
	•	Group Project: 40% (Team-based; maximum 5-page report in bullet point format plus exhibits/tables/visualizations applying the Problem-Plan-Data-Analysis-Conclusions (PPDAC) cycle to a supply chain analytics problem).
POLICIES

Class Policies
Arrive on time for every class, prepared with the assigned pre-reads and other work.
Install JMP Pro before our first class at: https://www.jmp.com/en/academic/jmp-student-edition
Laptops are required for in-class work and should be used only for course-related work during class.

Attendance Policy
The attendance policy as laid out by the Programme Office applies. Please refer to the student handbook for details.
Because much of the learning in this course occurs through discussion, responses to polling, and hands-on work, regular attendance and punctuality are essential.

Honour Code
BITSoM takes the honour code seriously, and so should you. The student handbook contains details on the honour code policy at BITSoM. You are expected to abide by an honour code and follow a culture of honesty. Please ensure that you read the relevant section(s) in the handbook. Feel free to ask the Programme Office if you have any questions.
Unless specifically permitted, students may not use prior solutions, unauthorized external help, or AI-generated outputs in place of their own analysis.

Coding scheme for all course work
Code
Nature of Coursework Discussion
Nature of Reference Material

General Discussions
Specific Discussions
External Material
Case/Problem Solutions
AC-I
Not Allowed
Not Allowed
Not Allowed
Not Allowed
AC-II a
Allowed
Not Allowed
Not Allowed
Not Allowed
AC-II b
Not Allowed
Not Allowed
Allowed
Not Allowed
AC-III a
Allowed
Allowed
Not Allowed
Not Allowed
AC-III b
Allowed
Not Allowed
Allowed
Not Allowed
AC-III c
Not Allowed
Not Allowed
Allowed
Allowed
AC-IV
Allowed
Allowed
Allowed
Not Allowed
AC-V
Allowed
Allowed
Allowed
Allowed

Assessment Component
Honor Code
Class Attendance/Participation
AC-V
Quizzes
AC-I
Group Project
AC-III c

SESSION SCHEDULE (Tentative and subject to change)

Session 1: Introduction to Supply Chain Analytics
Why supply chain analytics matters; PPDAC cycle; Gartner analytics maturity model; process view of plan-source-make-deliver-return; aligning managerial questions with data and analytics choices.
Analytics emphasis: descriptive analytics and data quality checks.
Readings: selected overview note on supply chain analytics; short background reading on supply chain processes and performance metrics.
Hands-on exercises: JMP Pro introduction; importing data, data cleaning, summary tables, and visual dashboards. Build and interpret a basic dashboard for a supply chain dataset and identify two managerial questions that need deeper analysis.

Session 2: Inventory Analytics
Inventory drivers, service levels, stockouts, excess inventory, inventory segmentation, and promotional effects.
Analytics emphasis: descriptive and diagnostic analytics for inventory imbalance.
Readings: note on inventory metrics and inventory policy trade-offs; short reading on ABC-style segmentation and root-cause diagnosis.
Hands-on exercises: exploratory analysis of SKU-level inventory data; pivots, distributions, Pareto views, and exception flags. Diagnose the causes of overstock and understock across categories and recommend a targeted response.

Session 3: Demand Forecasting
Role of forecasting in supply planning, sales & operations planning (S&OP), and capacity decisions; forecast error; bias vs variance; when simple models outperform complex ones.
Analytics emphasis: predictive analytics using time-series and regression-based forecasting.
Readings: forecasting note covering baseline methods, seasonality, accuracy metrics, and model evaluation.
Hands-on exercises: holdout-based forecast comparison in JMP Pro; moving average, exponential smoothing, and regression- and machine learning-based alternatives as appropriate. Compare two candidate forecasting approaches and justify which one should be used operationally.

Session 4: Supply Chain Visibility and Fulfillment
Order-to-delivery visibility, promised vs actual lead times, on-time-in-full (OTIF) performance, exceptions, and customer-facing service metrics.
Analytics emphasis: descriptive and diagnostic analytics on event and shipment data.
Readings: note on lead-time decomposition, fulfillment metrics, and visibility challenges in multi-stage supply chains.
Hands-on exercises: analysis of shipment event data; delay decomposition and lane/customer/service-level comparisons. Identify the most consequential points of delay in shipment flow and recommend a visibility intervention.

Session 5: Sourcing and Supplier Evaluation
Spend visibility, supplier performance, total cost of ownership, sourcing trade-offs, and structured supplier choice.
Analytics emphasis: diagnostic and prescriptive analytics for supplier assessment.
Readings: note on supplier scorecards, evaluation across multiple criteria, and procurement analytics.
Hands-on exercises: spend analysis, supplier segmentation, weighted scorecards, and scenario analysis. Recommend a sourcing shortlist for a focal category based on price, reliability, and risk indicators.

Session 6: Production Planning and Quality
Capacity utilization, throughput, bottlenecks, quality variation, defect prediction, and operational prioritization.
Analytics emphasis: diagnostic analytics (Pareto/clustering) and predictive analytics for quality outcomes.
Readings: note on process analytics, bottleneck diagnosis, and predictive quality management.
Hands-on exercises: clustering, Pareto charts, and decision-tree models in JMP Pro. Prioritize the most important quality or maintenance drivers and recommend an operational response.

Session 7: Warehouse Operations
Warehouse flows, picking productivity, congestion, location assignment, and labour-productivity trade-offs.
Analytics emphasis: prescriptive analytics for layout and slotting decisions.
Readings: note on warehouse analytics, slotting logic, and resource allocation.
Hands-on exercises: warehouse ABC analysis, travel-distance logic, and simplified slotting optimization. Redesign a small warehouse slotting plan to reduce travel and improve picking efficiency.

Session 8: Logistics
Transportation planning, route design, delivery density, cost-to-serve, and service reliability.
Analytics emphasis: prescriptive analytics using transportation and routing logic.
Readings: note on network flow, routing trade-offs, and last-mile economics.
Hands-on exercises: transportation/network models and simplified vehicle-routing scenarios. Evaluate alternative delivery plans and choose the plan that best balances cost and service.

Session 9: Resilience, Sustainability, and Ethics
Supply disruptions, stress testing, buffers, resilience levers, environmental, social, and governance (ESG) trade-offs, and the ethics of algorithmic decision-making.
Analytics emphasis: diagnostic and predictive risk analytics, scenario analysis, and simulation logic.
Readings: note on disruption management, scenario planning, and sustainability metrics in supply chains.
Hands-on exercises: anomaly detection, scenario comparison, and simple stress-test analysis. Stress-test a supply network under disruption assumptions and recommend resilience actions.

Session 10: Supply Chain Coordination
Coordinating forecasts, inventory, contracts, incentives, and cross-functional trade-offs; translating analytics into strategic recommendations; limits and uses of generative AI in supply chain work.
Analytics emphasis: integrated descriptive-to-prescriptive decision framing plus communication of recommendations.
Readings: note on supply chain coordination, contracts, and strategy translation; project guidance note.
In-class activity: Quick 5-minute overviews of group project ideas.$OUTLINE_q9z$),
  ('IFIN', 'International Finance', $OUTLINE_q9z$Global Financial Architecture: Crises, Capital &
Policy
Two-Week Intensive Course Outline
30 Hours | 10 Sessions × 3 Hours | July 1-11 (break on Sunday, July 5th)
Instructor: Professor Prachi Mishra

Course Overview
This intensive course provides a rigorous grounding in the architecture of the global financial system—
how it was built, how it fractures, and how policy responds. Beginning with the post-WWII institutional
foundations and the evolution of the international monetary system, the course traces the forces that
shape exchange rates, drive inflation, and determine the stance of monetary policy across major
economies.
From these foundations, the course turns to financial fragility—examining the anatomy of banking
crises, sovereign debt distress, and systemic contagion, from the Global Financial Crisis of 2008–09 to
the Eurozone sovereign debt crisis and recent banking stress. Subsequent sessions address capital
flows, sovereign risk, and the practical tools of currency risk management, before culminating in a
detailed case study of Argentina as a lens on chronic crisis, IMF conditionality, and the limits of
stabilisation policy.
A dedicated final session focuses on India: tracing the evolution of its financial markets and regulatory
institutions from the 1970s to the present and examining how the RBI navigates the intersection of
monetary policy, financial stability, fiscal dynamics, and capital account management in a large
emerging market. The concluding session includes student policy challenge presentations.

           📅📅 Format                      ⏱ Total Hours                      🇮🇮🇮🇮 India Session
     5 days/week × 2 weeks                 30 contact hours                  Week 2, Thursday
       3 hours per session                 10 sessions total               Session 10 (dedicated)

 Session       Day              Topic                               Key Content
     1         Mon       Foundations of            • Post-WWII global financial system architecture
                         Global Finance            • Developed vs. emerging economies: key
                         Architecture & Key            distinctions
                         Institutions              •   India's place in the global picture
                                                   •   What changes when economics goes global
                                                   •   Roles of the IMF and World Bank
                                                   •   Introduction to global finance and economic
                                                       data: Haver Analytics

     2         Tue       Exchange Rates            • World exchange rates and major currencies
                         History &                   today
                         Architecture of the       • Bretton Woods and its collapse
                         International             • Rise of fiat currencies and floating exchange
                         Monetary System             rates
Session   Day          Topic                            Key Content
                                      • Dollar dominance: safe-haven and reserve
                                          currency status
                                      •   The current global reserve system
                                      •   The rise of the Euro and its unique structure
                                          (monetary but not fiscal union)
                                      •   Swiss franc as a safe-haven currency; gold
                                      •   Theoretical frameworks: Purchasing Power
                                          Parity and Triffin's Dilemma

  3       Wed   Global Inflation      • Global and US inflation as a driver of the risk-
                Rise, Fall & Policy       free rate
                Response              • What is inflation? Measurement approaches
                                          (e.g., PCE used by the Fed)
                                      • Inflation expectations: why they matter, how
                                          they are measured, and stickiness
                                      •   Hedging against inflation: inflation-indexed
                                          bonds
                                      •   History of inflation targeting
                                      •   Post-pandemic inflation surge: supply chains
                                          and commodity shocks
                                      •   Bernanke–Blanchard analysis
                                      •   Global disinflation, 2023–2025

  4       Thu   Monetary Policy       • Why monetary policy matters in finance: setting
                Frameworks & Tools        the risk-free rate
                                      •   How monetary policy should be set: Friedman's
                                          framework; growth–inflation–stability tradeoffs
                                      •   Central bank independence and credibility
                                      •   Conventional and unconventional monetary
                                          policy tools (QE, forward guidance)
                                      •   The effective lower bound (ELB)
                                      •   US dominance: global spillovers from Fed policy

  5       Fri   Financial Crises      • Anatomy of a financial crisis (Fischer)
                Fragility in the      • The Global Financial Crisis, 2008–2009:
                Global Financial          shadow banking and systemic risk
                System                • Eurozone sovereign debt crisis: the PIIGS
                                          episode
                                      •   Banking crises, bank runs, and the SVB stress
                                          of 2023
                                      •   Crisis response and prevention frameworks
                                      •   Institutional resilience: capital adequacy, BIS
                                          rules, supervisory tightening, and India's Asset
                                          Quality Review
                                      •   Non-bank and shadow banking risks
Session   Day          Topic                          Key Content
  6       Mon   Sovereign Risk      • Fiscal policy: what it is and why it matters — the
                Debt, Deficits &      counterpart to monetary policy
                Credit Ratings      • Fiscal dominance
                                    • Fiscal policy in emerging markets
                                    • Fiscal multipliers in local and global contexts
                                    • Deficits, debt-to-GDP ratios, and debt
                                      sustainability frameworks
                                    • Sovereign credit ratings
                                    • Post-pandemic fiscal trajectories: global
                                      consolidation vs. US expansion

  7       Tue   Global Finance &    •   IMF Global Financial Stability Report: overview
                Capital Flows       •   The global financial cycle (Rey)
                Markets, Cycles &   •   Cross-border capital flows
                Spillovers          •   Exchange rates and currency crises
                                    •   Renminbi spillovers and China's growing global
                                        role

  8       Wed   Currency Risk       • FX risk for different economic agents:
                Management              corporates, households, and governments
                FX Instruments &    • Restrictions on investing abroad: original sin vs.
                Market Dynamics         pure domestic issuance
                                    • Instruments for managing FX risk: spot,
                                      forwards, and forward risk premiums
                                    • Central bank interventions in FX markets
                                    • Speculative attacks on currencies
                                    • Dollar debasement trade

  9       Fri   Case Study:         •   Argentina: chronic crises and dollarization
                Argentina &         •   IMF programs and conditionality
                Course              •   Lessons for emerging markets
                Synthesis           •   Policy challenge presentations (Mock MPC)
                Crisis, IMF         •   Course synthesis and Q&A
                Programs & Policy
                Wrap-Up

  10      Thu   India:              • Indian financial markets and policy: 1970s to
                Macroeconomics          present
                & Finance           •   Inflation targeting and financial stability
                Special Session —   •   The RBI and Government of India: institutional
                India Focus             relationship
                                    •   Monetary policy instruments and financial
                Policy Challenge        stability tools
                Presentations       •   Institutional structure: MPC and FSDC
                                    •   Fiscal policy, the FRBM framework, and the
                                        Finance Commission
                                    •   Currency risk and risk management in the
                                        Indian context
                                    •   Banking sector: public sector banks (PSBs),
                                        private banks, Priority Sector Lending, NPAs,
                                        and the Asset Quality Review
Session   Day   Topic                   Key Content
                        • Financial inclusion: PMJDY, demonetization,
                          and UPI
                        • FBIL benchmark rates: a guide to Indian interest
                          rate data$OUTLINE_q9z$),
  ('STOP', 'Sustainable Operations', $OUTLINE_q9z$BITS SCHOOL OF MANAGEMENT
Term 4, Block 19, 2026 - 27
Course Outline

Course Title: Sustainable Operations

Faculty: Prof Vinayak Deshpande

Dates: July 13th to July 24th, 2026

Contact details:  vinayak_deshpande@kenan-flagler.unc.edu

Course Description:

Sustainable enterprise is a way of doing business that makes profits through means that reduce harm to society and the environment. The Brundtland commission defines “sustainable development” as development that meets the needs of the present without compromising the ability of future generations to meet their own needs. There are many dimensions of sustainability which are often captured through triads such as the “three E’s” (Economics, Environment and Equity) or the “three P’s” (Profit, Planet and People).

Operations management can be defined as the design, operation, and improvement of the systems that create and deliver the firm's primary products and services.  The Operations function of a firm focuses on adding value through the transformation process of converting inputs to outputs. The transformation processes can be physical (manufacturing), locational (transportation), exchange (retailing), storage (warehousing), informational (telecom), and many more.

In this course, we will explore the link between Sustainability and the Operations function of a firm. In particular, we will focus on the following activities encompassing the Operations function of a firm: 1) Product and Process design; 2) Manufacturing; 3) Transportation, Logistics and Distribution, 4) Closed-loop/ After-sales operations such as recycling, remanufacturing and reuse, and 5) Supply Chain Management. Particular attention will also be directed to issues related to impact on people and the planet, through topics such as Humanitarian logistics, and Supply chain management in developing countries. Students interested in careers in Operations, Manufacturing, Consulting, Strategy, and Finance will find the frameworks developed in this course valuable.
COURSE OBJECTIVES

	•	Provide an understanding of the link between the sustainability goals and the operation function of a firm.
	•	Develop an understanding of Environmental dynamics and give an overview of Environmental legislation and its impact on the Operations function.
	•	Show profit and sustainability opportunities that exist by radically rethinking products/services sold by a firm through “Servicization”.
	•	Examine the tradeoffs that managers’ face while developing new products in emphasizing one goal (e.g., reduced product cost) as compared to another goal (such as reduced environmental impact).
	•	Make the connection between principles of lean manufacturing and sustainability.
	•	Compare and contrast the strengths and weaknesses of different strategies and techniques in closed-loop operations such as remanufacturing, recycling and reuse.
	•	Understand sustainability issues in Transportation, Distribution and Logistics function of a firm.
	•	Show how Supply Chain/Logistics preparedness of an organization can help achieve humanitarian aid goals.
	•	Highlight challenges that arise in addressing sustainability issues in a global supply-chain involving developing countries.
	•	Highlight the role of newer technologies such as Block Chains and Machine Learning/AI in achieving sustainability goals
	•	Provide an opportunity to analyze a sustainability issue in greater depth through a course project.

Course Materials: 
Required: Course packet

Optional: “Sustainable Operations and Closed-Loop Supply Chains” by Gilvan C. Souza, businessexpertPress, 1st edition, 2012

Assessment: Maximum Marks 100

	•	Class Participation: 20%
	•	Case Reports (Individual, any 4): 30%
	•	Group Case Analysis (In-class):  Interface's Evergreen Service Agreement/Servicization: 20%
	•	Final Project Presentation (Group): 15%
	•	Final Project Report (Group): 15%

Case Reports (Individual, any 4):  30%
For a set of (any) four cases, please answer the questions posted on the course portal for your case report. The purpose of Canvas case questions is to get you ready for class discussion. All case questions should be submitted by the due date/time posted before class discussion.

Class Participation:
Students are expected to come to class having completed the readings and having prepared the case.  The questions for each case that will be discussed in class will be posted on the course website. Students are expected to come prepared with a response to these questions. Typically, I will select three or four answers from students who will be expected to explain or elaborate on their analysis.  As a group, we will try to build a complete analysis of the situation and address the problems and issues it presents.  We also will talk about the implementation of those recommendations and the complexities of effecting change in firms with a strong operations component.

Group Case Analysis (In-class):  Interface's ESA/Servicization:

We will have a working session during which student teams will analyze the Interface ESA case. A list of questions to be analyzed will be posted on course page. Teams of approximately four-five students each will conduct their analysis and create a five-slide presentation. I will call on a subset of teams to present their analysis at the end of this session. You should read this case ahead of class but not required to solve it before class. There will be enough time allocated to complete the analysis during this working session.

Course Project:
The course project will be conducted in groups of four-five students each. For the project, first identify an industry or firm or a product or a service of your interest. The goal of the project is to provide an analysis of “operations” issues related to sustainability for your chosen industry/firm/product/service. Details about the course project will be posted on course page. The goal of the project is to develop the ability to apply the concepts learned in this course to a real-world setting.

There are two deliverables associated with your course project:
	•	An in-class presentation along with its slide deck to convince your stakeholder/s of your proposed strategy, along with brief powerpoint slides.
	•	A final written report in pdf format as directed on the course page. There is no page limit on the written report, but it should be professional including an executive summary.

The grade for your course project is based on four components: breadth and depth of your research (the quantity and quality of material you find concerning your topic), quality of analysis, quality of writing of your report, and the quality of presentation (in convincing your stakeholder).

There will be no Final Exam in this course.

POLICY:

Class Policies
     We will start classes on time.
     If you are late, the instructor has the choice of not allowing you to attend or creating creative punishments for tardiness.

Attendance Policy
The attendance policy as laid out by the Programme Office applies. Please refer to your student handbook for details.

Honour Code
BITSoM takes the honour code seriously, and so should you. The student handbook contains details on the honour code policy at BITSoM. You are expected to abide by an honour code and follow a culture of honesty. Please ensure that you read the relevant section(s) in the handbook. Feel free to ask us in case you have any questions. It is the student’s responsibility to check with the instructor if a particular action may be deemed as a violation of the honor code. If in doubt, ask your instructor first before proceeding.

Coding scheme for all course work:

Code
Nature of Course work Discussion
Nature of Reference Material

General Discussions
Specific Discussions
External Material
Case/Problem Solutions
AC-I
Not Allowed
Not Allowed
Not Allowed
Not Allowed
AC-IIa
Allowed
Not Allowed
Not Allowed
Not Allowed
AC-IIb
Not Allowed
Not Allowed
Allowed
Not Allowed
AC-IIIa
Allowed
Allowed
Not Allowed
Not Allowed
AC-IIIb
Allowed
Not Allowed
Allowed
Not Allowed
AC-IIIc
Not Allowed
Not Allowed
Allowed
Allowed
AC-IV
Allowed
Allowed
Allowed
Not Allowed
AC-V
Allowed
Allowed
Allowed
Allowed

Component
Honor Code
Case reports
AC-IIa
Group Case Analysis
AC-IIa
Course Project
AC-IV

Session Schedule (Tentative, Final schedule will be announced closer to course start)

Day 1:

Session 1.
Topic: Introduction to Sustainable Operations
Objective: Provide an understanding of the link between the sustainability goals and the operations function of a firm.

Session 2.
Topic: Environmental Legislation and Operations
Objective: To provide an overview of Environmental legislation and its impact on the Operations function
Reading: Case- “The European Recycling Platform: Promoting Competition in e-waste Recycling”
Case Questions:
1.      What were the deficiencies of the national consortium model for recycling, such as the Green Dot System?
2.      What were the driving values of the ERP model? In what ways did they address the deficiencies of the national consortium / Green Dot model?
3.      Should ERP expand its scope?    

Day 2
Sessions 3 and 4.

Topic: Fishbanks Simulation Game and debrief
Objective: Provide a hands-on experience in challenges that arise in managing a renewable resource. Develop an understanding of Environmental dynamics and a discussion about managing the “Tragedy of Commons”.

Readings: Read the short Fishbanks Intro.Sterman.pdf document before class
Hardin, G., “Tragedy of the Commons” , Science,  1968, Vol 162, p1243-1248

Day 3

Session 5.

Topic: Product design for Environment

Objective: Examine the tradeoffs that managers’ face while developing new products in emphasizing one goal (e.g., reduced product cost) as compared to another goal (such as reduced environmental impact).

Reading
Case: "Cradle-to-cradle design at Herman Miller: Moving toward environmental sustainability"

Case questions:
	•	Do you think Herman Miller should use PVC or TPU in the Mirra Chair arm pad?
	•	Why is the PVC vs. TPU decision so difficult for the company to resolve?
	•	 What is your assessment of how Herman Miller implemented the C2C protocol?
	•	Why did Herman Miller undertake this strategic environmental initiative?

Session 6.

Topic: Lean and Green Operations

Objective: Develop a framework for analyzing waste management options in manufacturing. Make the connection between principles of lean manufacturing and sustainability.

Reading:
Case: Cook Composites and Polymers Co.

Case Questions:
CCP faces three options for addressing its rinse styrene waste stream:
	•	Continue with business-as-usual, sending its rinse styrene to cement kilns;
	•	Sell its rinse styrene on a waste eXchange; or
	•	Proceed with developing the concrete coating that uses its rinse styrene (BPS).

	•	What criteria should Mike Gromacki consider when deciding whether to pursue the waste exchange or the concrete-coating by-product? If you are Mike Gromacki, what would you recommend to management to address its rinse styrene waste stream?
	•	Compared to business as usual, how would selling rinse styrene to a waste exchange or producing the concrete by-product affect the production of gel coats? Assume that the gel coat production process is operating at capacity.
	•	Compared to business as usual, what are the financial implications of selling rinse styrene to a waste exchange or of producing the concrete coating by-product (BPS)?

Prepare question 4 below for class discussion (you do not need to answer this question in your write-up)
	•	What is the environmental impact of implementing BPS? Consider just the impact on CO2 emissions. Note that diverting 1 pound of Styrene from cement kiln disposal to reuse in concrete coating increases the kiln’s emission by 1.2 pounds CO2. Producing concrete coating with 1 pound of rinse styrene emits 1.9 fewer pounds CO2 than conventional production of the same amount of concrete coating. Producing one pound of styrene results in 2.5 pounds of CO2 emissions.

 Day 4

Session 7.

Topic: Closed Loop Operations: Remanufacturing, Recycling and Reuse
Objective: Compare and contrast the strengths and weaknesses of different strategies and techniques in closed-loop operations such as remanufacturing, recycling and reuse

Reading:
Case: Product Returns at Hewlett Packard

Case Questions:
	•	Why do customers return printers and what can we do to reduce returns?
	•	How does HP manage the returns process from the consumer to the remanufacturing sites?
	•	How does the company decide to best recover value from returned products?

Session 8.

Topic: Humanitarian Logistics
Objective: Show how Supply Chain/Logistics preparedness of an organization can help achieve humanitarian aid goals.
Reading: Case: "UNICEF: Plumpy’Nut Supply Chain"
Case Questions:
1. What are the key differences between a commercial supply chain and a humanitarian supply chain?
 
2. Consider a situation where Paul commits to the establishment of a buffer inventory stock
a. What do you think are the advantages of implementing a buffer stock policy?
b. Which location would you choose for location of buffer stock and why?
c. What level of buffer stock would be ideal and how much investment would be needed to do so?
d. Are there any alternate arrangements that you would propose for location and distribution of buffer stock?
3. What other suggestions would you recommend to UNICEF that would help improve the performance of Plumpy’Nut Supply Chain?

Day 5

Sessions 9 and 10.

Topic: What is it that you are selling? “Products as services and services as products”
Objective: Provide an introduction to the “servicization” concept. Show profit and sustainability opportunities that exist by radically rethinking products/services sold by a firm through “Servicization”.

Reading
Case: Interface's Evergreen Service Agreement

Deliverables
Group Case Slide Deck: Interface's Evergreen Service Agreement
Answer Questions 1 through 4 listed below in your slide deck.
 
1.     Regarding the conventional economic arguments for providing services (i.e., leasing) rather than simply selling a product, which of these is most important in the carpet industry?
2.     What is your assessment of Interface’s Evergreen Services business model in 2002? Why is Interface having difficulty in selling Evergreen Service Agreements? 
3.     Provide a financial analysis (i.e., compute NPV; use yearly time buckets) of both leasing and selling alternatives from the University of Texas’ perspective, using the data provided in the case. Consider a 9% discount rate for computing NPV, and a seven-year leasing term. Here are the cash flow streams: 
Buying: initial cost (plus installation), 5% yearly carpet tile replacement starting in year 3, disposal at the end of year 7, and maintenance.
Leasing: Annual leasing expense, maintenance.
4.     Now, conduct a financial analysis of leasing vs. buying from Interface's perspective (i.e., compute after-tax NPV for both alternatives). Use the same assumptions as those made in the question from UT's perspective (9% interest rate, seven-year lease term, yearly time buckets). Don't forget to consider depreciation in the leasing alternative, as in that case Interface owns the carpet. For the depreciation schedule, use the MACRS schedule (used for tax purposes), which is 14.29%, 24.49%, 17.49%, 12.49%, 8.92%, 8.92%, 8.92%, and 4.46% for years 1 through 8 respectively (although it is a seven-year lease, depreciation carries over to year 8). Use Interface's COGS as shown in the financial data in the case. Assume a 35% corporate income tax rate, and a residual value of $0 for Interface for end of lease carpet. Here are the cash flow streams:
Selling: initial carpet sale (minus COGS), installation, replacement (minus COGS) from years 3 through 7.
Leasing: cost (COGS) of carpet at year 0, lease payments, maintenance payments (minus COGS), replacement cost (at COGS) in years 3 through 7.   

Which option is better for Interface?
Considering your answers for questions 3 and 4, how should Interface change its business model?

Day 6

Session 11 and 12.

Topic: Sustainability in the Supply Chain
Objective: Explore sustainability challenges in managing a firm’s supply chain

Article: “Carbon Footprints: Methods And Calculations
Reading
Case: Walmart's Sustainability Strategy
Case Questions:
1.     Given the fact that Wal-Mart’s customers generally are unwilling to pay a premium for environmentally friendly products, how is the company deriving business value from its sustainability strategy, or, if not, how can it ensure that it does?
2.     Imagine that you are evaluating the progress of the electronics, seafood, and textiles networks. Which networks have been most successful? What factors explain the successes (or lack of successes) of these networks?
3.     How is Wal-Mart motivating its suppliers to share information about and continuously reduce the environmental impacts of products and processes? How can the company stimulate the development of breakthrough innovations?
4.     Propose one new “game changer” or “innovation project” not described in the case, for any of the networks. To support your proposal, outline the environmental benefits, the profit opportunity for Wal-Mart, the greatest challenges to implementation, and how Wal-Mart could overcome them. Please be prepared to discuss your proposal in class.
5. Given its underlying business model and scale, can Walmart ever truly be sustainable? Why or Why not?

Day 7

Session 13 and 14.

Topic: Sustainable Operations in a developing country
Objective:  Highlight challenges that arise in addressing sustainability issues in a global supply-chain involving developing countries.
Reading:
Case: Sustainability at Taylor Guitars
Case questions:
(1) Vertical integration: should the company backward integrate?
(2) Becoming supplier of competitor: how should Taylor Guitars leverage this special relationship with its competitors? Should it price the competitors out given that there does not seem to be a good alternative material.
(3) Sustainability: Should it use streaked-ebony to make guitars?
(4) Corporate social responsibility: How should it handle the angry African employees? How to deal with bribery in Cameroon and local government?

Day 8

Session 15

Topic: Operations and Sustainable Energy
Objective: provide an exposure to the sustainable-development challenges facing electric utility companies and the operations issues involved

Session 16

Topic: Energy Efficiency Paradox
Objective: To gain exposure to the energy efficiency paradox; to evaluate a service provider’s business strategy for green tech
Reading: Case: Groom Energy Solutions: Selling Efficiency
Case Questions:
	•	Does energy efficiency provide a substantial opportunity to reduce carbon emissions in a cost effective manner?
	•	How does Groom Energy create value for its customers?
	•	Which segments should Groom Energy focus on for its future growth?
	•	Which barriers to investment in energy efficiency is Groom Energy well positioned to overcome?

Day 9

Session 18

Topic: Sustainable Energy in India

Guest Speaker: Mr. Ranjit Gupta, cofounder and CEO of Ocior Energy will share his experience in developing sustainable energy solutions in India including Green Hydrogen, Solar, and Wind power.

Session 19

Topic: Green Tech - Emerging technologies and Sustainability
Objective: To gain and understanding of how emerging technologies such as AI/Machine Learning and Block Chains can be deployed to achieve sustainability goals

Day 10

Session 19 and 20

Topic: Student Project Presentations
Objective: Provide an opportunity to analyze a sustainability issue in greater depth through a course project.$OUTLINE_q9z$),
  ('SADT', 'Sales & Distribution', $OUTLINE_q9z$2-Year Flagship MBA Program Course Outline 2026-2027
Course Title: Sales & Distribution Management

Faculty: Mudit Mathur

Email: mudit_mathur@hotmail.com

Dates: July 13, 2026 – July 26, 2026
Course Title: Sales & Distribution Management

Faculty: Mudit Mathur

Email: mudit_mathur@hotmail.com

Dates: July 13, 2026 – July 26, 2026
Course Objectives:

In this course, we will cover the core concepts and applicable principles in Sales & Distribution management strongly embedded in Indian trade perspective but with global mindset and learnings from best practices. The course will look at sales and distribution strategies, resolving the incumbent conflicts and making strategic choices in the context of the organization strategy, marketing objectives and trade and shopper dynamics. The approach will be to look at applications and adaptations of fundamental principles among a diverse set of categories, channels, and business models, including the online and International business. The course blends the analytical thinking with the leadership and strategic thinking required to manage a profitable sales delivery system, including sales force management, managing partnerships, and effective use of information technology and sales analytics.

Key Takeaways/Learning Goals:

	•	Build robust commercial excellence thinking that leverages sales and distribution to add value to the business.
	•	Understand the role of sales and distribution management in the context of a consumer and marketing objective
	•	Building the understanding of selling strategy, channel strategy, customer strategy, shopper strategy, the role of shopper marketing and retail marketing, promotional strategy, trade marketing, and roles of different types of channels within a category
	•	Understand the factors that go into creating and running an effective sales and distribution setup
	•	Learn how to create a comprehensive sales and distribution plan
Course Objectives:

In this course, we will cover the core concepts and applicable principles in Sales & Distribution management strongly embedded in Indian trade perspective but with global mindset and learnings from best practices. The course will look at sales and distribution strategies, resolving the incumbent conflicts and making strategic choices in the context of the organization strategy, marketing objectives and trade and shopper dynamics. The approach will be to look at applications and adaptations of fundamental principles among a diverse set of categories, channels, and business models, including the online and International business. The course blends the analytical thinking with the leadership and strategic thinking required to manage a profitable sales delivery system, including sales force management, managing partnerships, and effective use of information technology and sales analytics.

Key Takeaways/Learning Goals:

	•	Build robust commercial excellence thinking that leverages sales and distribution to add value to the business.
	•	Understand the role of sales and distribution management in the context of a consumer and marketing objective
	•	Building the understanding of selling strategy, channel strategy, customer strategy, shopper strategy, the role of shopper marketing and retail marketing, promotional strategy, trade marketing, and roles of different types of channels within a category
	•	Understand the factors that go into creating and running an effective sales and distribution setup
	•	Learn how to create a comprehensive sales and distribution plan

Assessments:

Component
Weight
Honor Code
Class Participation
15%
-
2 Quizzes* (Quiz 1 & 2)
30%
AC-I
Group Assignment
35%
AC-IIIb
Individual Assignment
20%
AC-lllb
*  Quiz 1 Assignment,  Quiz -2 end of the term MCQ exam

	Honor Codes:

Code
Nature of Course work Discussion
Nature of Reference Material

General Discussions
Specific Discussions
External Material
Case/Problem Solutions
AC-I
Not Allowed
Not Allowed
Not Allowed
Not Allowed
AC-IIa
Allowed
Not Allowed
Not Allowed
Not Allowed
AC-IIb
Not Allowed
Not Allowed
Allowed
Not Allowed
AC-IIIa
Allowed
Allowed
Not Allowed
Not Allowed
AC-IIIb
Allowed
Not Allowed
Allowed
Not Allowed
AC-IIIc
Not Allowed
Not Allowed
Allowed
Allowed
AC-IV
Allowed
Allowed
Allowed
Not Allowed
AC-V
Allowed
Allowed
Allowed
Allowed

Assessment Guidelines:

Class Participation: If you are absent, you lose CP points per class. Contributions to the class, especially during case discussions, will be expected. Evaluation of your class contribution will be based on both the quality and the quantity of your contributions, especially during case discussions. Quality of contributions, however, will receive greater consideration than quantity of contributions. There will be 1 page submission for few sessions, based on class preparation questions. Individual assignments and quizzes will be used to capture the understanding of the subject and not necessarily a memory test.
Assignment Schedule: A written examination will be conducted after the conclusion of the course.

Sessions Schedule

Session 1: Introduction to Sales & Distribution Management – July 13, 2026
Before Class: Preparation for the case
In class: Scope of Sales and Distribution and its impact on organizational success. Case: Coca-Cola in India: Innovative Distribution Strategies with 'Red' Approach
After Class: Extra Readings to see how different organizations are approaching sales and distribution

Session 2: Shopper Strategy and Retail Management – July 14, 2026
Before Class: Readings: 1. How to Win in an Omnichannel World, 2. 8 Important Metrics for Retail Industry KPIs Table 3. Choosing the Right Customer
In class: Understanding of the end shopper and the retail customer needs, the segmentation, and impact on our sales strategy choices.
After Class: Quiz 1 - Shopper & Retailer Study – Submission due on the July 18, 2026

Session 3: Distribution Networks – July 15, 2026
Before Class: Case: An Irate Distributor: The Question of Profitability-question preparation
In Class: Understanding the role of Distribution Networks and the role of distributor partner
After Class: Further reading on ROI and other financials related to distribution

Session 4: Channel Management – July 16, 2026
Before Class: Reading - Designing Channels of Distribution. Case preparation- LDFL India Limited.
In Class: Role and scope of channel management. Optimize channel design to deliver on the primary customer needs
After Class: Exercise for various products and services
Sessions Schedule

Session 1: Introduction to Sales & Distribution Management – July 13, 2026
Before Class: Preparation for the case
In class: Scope of Sales and Distribution and its impact on organizational success. Case: Coca-Cola in India: Innovative Distribution Strategies with 'Red' Approach
After Class: Extra Readings to see how different organizations are approaching sales and distribution

Session 2: Shopper Strategy and Retail Management – July 14, 2026
Before Class: Readings: 1. How to Win in an Omnichannel World, 2. 8 Important Metrics for Retail Industry KPIs Table 3. Choosing the Right Customer
In class: Understanding of the end shopper and the retail customer needs, the segmentation, and impact on our sales strategy choices.
After Class: Quiz 1 - Shopper & Retailer Study – Submission due on the July 18, 2026

Session 3: Distribution Networks – July 15, 2026
Before Class: Case: An Irate Distributor: The Question of Profitability-question preparation
In Class: Understanding the role of Distribution Networks and the role of distributor partner
After Class: Further reading on ROI and other financials related to distribution

Session 4: Channel Management – July 16, 2026
Before Class: Reading - Designing Channels of Distribution. Case preparation- LDFL India Limited.
In Class: Role and scope of channel management. Optimize channel design to deliver on the primary customer needs
After Class: Exercise for various products and services

 Session 5: E-Commerce – July 17, 2026
Before Class: Amazon Food: Biting into the Food Delivery Market in India. Reading - bain_report_how_india_shops_online_2021
In Class: eCom as a channel choice. Strategy and execution elements.
Post Class: Individual Assignment due on July 19, 2026
Session 6: Sales Process and MIS – July 20, 2026
Before Class: Case preparation: Optima Business Group: Leveraging Information Technology for Salesforce Enablement. Reading: 7 Great Examples & Templates Of Sales Dashboards _ Tableau
In Class: Deeper understanding of the sales processes in different product/solutions group. Managing the process with relevant metrics to drive effectiveness and efficiency.
Post Class: Further reading

Session 7: Rural Channel Management – July 21, 2026
Before class: Prepare the Case - Nestlé's Expansion into Rural India
In class: Deep dive into nuances of rural as a channel and a business model
Post Class: Group Assignment – submission due date July 24, 2026

Session 8: Salesforce Management – July 22, 2026

Before Class: Case preparation: Laurs & Bridz: Sales Targets and Antiviral Drug Launch
In Class: Sales organization design, performance management, and sales force effectiveness.
Post Class: Further reading

Session 9: International Distribution Management – July 23, 2026
Before Class: Read up on firms with strong global models – Ikea, QSR chains (McD, Subway, Starbucks, Unilever, P&G…)
In Class: Imperatives and critical strategies for entry into International markets, stages and success factors, value chain analysis for a sales and distribution model.
Post Class: Group Assignment work to be delivered as a presentation on July 27, 2026
Quiz 2 (MCQ – 1 hour) to be conducted on July 24, 2026

Session 10: Group Assignment - Presentation and wrap-up – July 27, 2026

Session 5: E-Commerce – July 17, 2026
Before Class: Amazon Food: Biting into the Food Delivery Market in India. Reading - bain_report_how_india_shops_online_2021
In Class: eCom as a channel choice. Strategy and execution elements.
Post Class: Individual Assignment due on July 19, 2026
Session 6: Sales Process and MIS – July 20, 2026
Before Class: Case preparation: Optima Business Group: Leveraging Information Technology for Salesforce Enablement. Reading: 7 Great Examples & Templates Of Sales Dashboards _ Tableau
In Class: Deeper understanding of the sales processes in different product/solutions group. Managing the process with relevant metrics to drive effectiveness and efficiency.
Post Class: Further reading

Session 7: Rural Channel Management – July 21, 2026
Before class: Prepare the Case - Nestlé's Expansion into Rural India
In class: Deep dive into nuances of rural as a channel and a business model
Post Class: Group Assignment – submission due date July 24, 2026

Session 8: Salesforce Management – July 22, 2026

Before Class: Case preparation: Laurs & Bridz: Sales Targets and Antiviral Drug Launch
In Class: Sales organization design, performance management, and sales force effectiveness.
Post Class: Further reading

Session 9: International Distribution Management – July 23, 2026
Before Class: Read up on firms with strong global models – Ikea, QSR chains (McD, Subway, Starbucks, Unilever, P&G…)
In Class: Imperatives and critical strategies for entry into International markets, stages and success factors, value chain analysis for a sales and distribution model.
Post Class: Group Assignment work to be delivered as a presentation on July 27, 2026
Quiz 2 (MCQ – 1 hour) to be conducted on July 24, 2026

Session 10: Group Assignment - Presentation and wrap-up – July 27, 2026$OUTLINE_q9z$),
  ('FWKJ', 'Future of Work and Jobs', $OUTLINE_q9z$Future of Work and Jobs – Organizational Perspective: Syllabus ©Prithwiraj Choudhury, 2026

FUTURE OF WORK AND JOBS – AN ORGANIZATIONAL PERSPECTIVE

Summary
The art and science of managing work is under transition. Proliferation in remote, distributed and
hybrid work arrangements and changes to global migration policy has ushered debates on the ‘ideal’
work arrangement for both desk-based and deskless workers. In parallel, the onset and rapidly
changing landscape of AI and automation technologies has led to questions on how to manage
talent. This technological disruption has the potential to create, transform and render obsolete jobs
and occupations across industries and countries. For organizations, this precipitates debates on how
to employ AI and automation for enhanced productivity while humanely managing the reskilling and
retrenchment of workers. For individuals, questions abound on how to manage ones’ career amidst
these rapidly unfolding technological and policy shifts.
         The course ‘Future of Work and Jobs – Organizational Perspective (FOWAJ)’ will
engage with these debates and questions by employing an organizational perspective. Drawing on
theories and ideas from several streams of the organizational literature, notably research on
distributed work1, geography of work2, organizational communication3, skill-biased technological
change4, and strategic human capital5, this course will equip students with a set of frameworks and
insights to navigate this changing landscape of work.
         The course will comprise two main modules. The first module will relate to how work and
careers should be managed in light of the AI and automation revolution. This module will introduce
students to the importance of domain expertise in maximizing benefits from using AI6, the concept
of algorithm aversion7, how digital twins are disrupting jobs in deskless and semi-desk settings, and

1 Hinds, Pamela, and Sara Kiesler, eds. Distributed work. MIT press, 2002.
2 Choudhury, Prithwiraj. "Geographic mobility, immobility, and geographic flexibility: A review and agenda for research

on the changing geography of work." Academy of Management Annals 16, no. 1 (2022): 258-296.
3 Daft RL, Lengel RH (1986) Organizational information requirements, media richness and structural design. Management

Science. 32(5):554–571.
4 Chari, Varadarajan V., and Hugo Hopenhayn. "Vintage human capital, growth, and the diffusion of new technology."

Journal of Political Economy 99, no. 6 (1991): 1142-1165.
5 Chadwick, Clint. "Toward a more comprehensive model of firms’ human capital rents." Academy of Management Review

42, no. 3 (2017): 499-519.
6 Choudhury, Prithwiraj, Evan Starr, and Rajshree Agarwal. "Machine learning and human capital complementarities:

Experimental evidence on bias mitigation." Strategic Management Journal 41, no. 8 (2020): 1381-1411.
7Allen, Ryan, and Prithwiraj Choudhury. "Algorithm-augmented work and domain experience: The countervailing forces

of ability and aversion." Organization Science 33, no. 1 (2022): 149-169.

                                                                                                                          1
Future of Work and Jobs – Organizational Perspective: Syllabus ©Prithwiraj Choudhury, 2026

implications for jobs and careers8. This module will also conduct a deep-dive into what Generative
AI portends for skills, jobs and careers of the future, and will introduce students to the concept of
agentic AI, especially codified-selves, micro-AI representations (e.g., personalized bots) that may
substitute and/or complement individuals, and what the upcoming Bot-revolution means for
workers and organizations.
         The second module will deal with questions around where work should be performed, and
talent be located. This module will introduce students to a framework on frictions to migration and
geographic mobility and will conduct a deep-dive into work-from-anywhere (WFA). The module will
argue that WFA is a game-changing talent strategy which could be a win-win-win for workers,
organizations and society if designed and implemented well. The class will engage in deep debates on
the pros and cons of remote-, hybrid- and in-person work arrangements, the effectiveness of ‘Return
to Office’ (RTO) mandates, and the exciting possibility of reverse brain-drain to smaller towns.
Drawing on insights from a recent book written by the instructor, students will be introduced to
best practices that maximize the benefits and mitigate the challenges of WFA. Students will also be
introduced to the digital nomad phenomenon and the changing global migration policy
environment. At the end of this module, students will be equipped with a framework on how to
decide on an ‘ideal’ work arrangement for themselves and their team, given their task, tenure, and
team characteristics. Students will also be made aware of management practices related to knowledge
codification, organizational communication, onboarding and mentoring, and forming organizational
connections needed to support the chosen work arrangement and work location.
         This course is intended for students planning to pursue careers managing talent in
organizations, and/or students who will engage in analyzing questions related to human capital
within mature companies and/or startups. We will cover cases set within multiple continents (North
America, Asia, Latin America, Europe) covering startups, as well as mature firms, in technology,
services, and manufacturing industries.

Grading
Grading will be based on class participation (20% weight), a quiz (30% weight) and a final project
(50% weight).

8 Autor, David H. "Why are there still so many jobs? The history and future of workplace automation." Journal of

economic perspectives 29, no. 3 (2015): 3-30.

                                                                                                                   2
Future of Work and Jobs – Organizational Perspective: Syllabus ©Prithwiraj Choudhury, 2026

Course Summary
The course comprises three modules:
1. Module 1 (“Classic Frameworks & current debates”) will review the core frameworks in
   analysis of human capital and will set-up the debate on how the advent of AI might transform
   views on value creation and value capture from human capital
2. Module 2 (“How to work with AI and automation”), will cover insights on domain
   knowledge and AI, algorithm aversion, automation and digital twins and generative AI and
   codified selves.
3. Module 3 (“Where to work and live”) will cover insights and frameworks related to migration,
   distributed and remote work, work-from-anywhere, hybrid work and digital nomadism.

 Session Module            Topic           Case/Lecture      Readings
 1       Module1           Is AI a         Lecture on        What is Disruptive Innovation,
                           Disruptive      disruptive        Harvard Business Review. Link:
                           Innovation      innovation        https://hbr.org/2015/12/what-is-
                                                             disruptive-innovation

 2          Module1        Which AI        Lecture on        Why Deepseek shouldn’t have been a
                           models will     disruptive        surprise, Harvard Business Review.
                           survive?        innovation in     Link: https://hbr.org/2025/01/why-
                                           AI industry       deepseek-shouldnt-have-been-a-
                                                             surprise

 3          Module1        Jobs to be      Case              McDonald, Rory, Allison Mnookin,
                           done            discussion on     and Iuliana Mogosanu. "The Walt
                                           jobs to be        Disney Company: Theme Parks."
                                           done              Harvard Business School Case 620-
                                           framework         039, August 2019. (Revised August
                                                             2024.)
 4          Module1        Your            Lecture on        Christensen, Clayton, Rory McDonald,
                           human           jobs to be        Laura E Day, and Shaye Roseman.
                           capital -       done and in-      "Integrating Around the Job to Be
                           what is the     class exercise    Done." Harvard Business School
                           job to be                         Module Note 611-004, August 2010.
                           done?                             (Revised November 2020.)

                                                                                                    3
Future of Work and Jobs – Organizational Perspective: Syllabus ©Prithwiraj Choudhury, 2026

 Session Module             Topic             Case/Lecture       Readings
 5       Module 2           ML & AI           Lecture on         Choudhury, Prithwiraj, Ryan T.
                            Basics            supervised         Allen, and Michael G. Endres.
                                              ML,                "Machine learning for pattern
                                              unsupervised       discovery in management research."
                                              ML and             Strategic Management Journal 42,
                                              generative AI      no. 1 (2021): 30-57.

 6          Module 2        AI & Domain       USPTO case         Choudhury, Prithwiraj, Tarun
                            Expertise         study*             Khanna, and Sarah Mehta. "The
                                                                 Future of Patent Examination at the
                                                                 USPTO." Harvard Business School
                                                                 Case 617-027, April 2017.
 7          Module 2        Algorithm         Lecture on         Allen, Ryan, and Prithwiraj
                            aversion          algorithm          Choudhury. "Algorithm-augmented
                                              aversion           work and domain experience: The
                                                                 countervailing forces of ability and
                                                                 aversion." Organization Science 33,
                                                                 no. 1 (2022): 149-169.

 8          Module 2        Job crafting      Lecture on job     What job crafting looks like,
                            with AI           crafting TCS       Harvard Business Review. Link:
                                              case study*        https://hbr.org/2020/03/what-job-
                                                                 crafting-looks-like
 9          Module 2        Digital twins:    Unilever case      Choudhury, Prithwiraj, and Susie L.
                            Reskilling and    study              Ma. "Unilever: Remote Work in
                            upskilling                           Manufacturing." Harvard Business
                                                                 School Case 622-030, March 2022.

 10         Module 2        Generative AI     Lecture on         Choudhury, Prithwiraj, Bart
                                              Codified           Vanneste, and Amirhossein
                                              Selves and         Zohrehvand. "The Wade Test:
                                              LLM aversion       Generative AI and CEO
                                                                 Communication." (2024).

 11                         In class quiz     Quiz               Quiz
 12         Module 3        Global            MobSquad           Choudhury, Prithwiraj, William R.
                            mobility          case study*        Kerr, and Susie L. Ma. "MobSquad."
                            frictions                            Harvard Business School Case 821-
                                                                 010, July 2020. (Revised September
                                                                 2020.)
 13         Module 3        ROPE              Lecture on         Choudhury, Prithwiraj. "Geographic
                            Frictions         geographic         mobility, immobility, and geographic
                                              mobility           flexibility: A review and agenda for
                                              frictions          research on the changing geography

                                                                                                        4
Future of Work and Jobs – Organizational Perspective: Syllabus ©Prithwiraj Choudhury, 2026

                                                                 of work." Academy of Management
                                                                 Annals 16, no. 1 (2022): 258-296
 14         Module 3        Migrants or       Sercomm            Choudhury, Prithwiraj, Gary P.
                            Robots?           China case         Pisano, and Bonnie Yining Cao.
                                              study*             "Sercomm: Operating in China
                                                                 Amid COVID-19 and Beyond."
                                                                 Harvard Business School Case 621-
                                                                 005, November 2020. (Revised
                                                                 March 2021.)
 15         Module 3        Hybrid Work       TCS case           Choudhury, Prithwiraj, and Malini
                                              study*             Sen. "TCS: From Physical Offices to
                                                                 Borderless Work." Harvard Business
                                                                 School Case 621-081, January 2021.
                                                                 (Revised February 2021.)

 16         Module 3        Reimagining       Goldman            Choudhury, Prithwiraj, Iavor I.
                            face to face      Sachs case         Bojinov, and Emma Salomon.
                            interactions      study*             "Creating a Virtual Internship at
                                                                 Goldman Sachs." Harvard Business
                                                                 School Case 621-035, November
                                                                 2020.
 17         Module 3        Digital Twins: Enerjisa case         Choudhury, Prithwiraj, and Sadika
                            Business       study                 El Hariri. "Enerjisa Üretim: The
                            transformation                       Digital Era of Electricity
                                                                 Generation." Harvard Business
                                                                 School Case 625-022, December
                                                                 2024
 18         Module 3        Reverse brain     Tulsa Remote       Choudhury, Prithwiraj (Raj), Emma
                            drain             case study*        Salomon, and Brittany Logan.
                                                                 "Tulsa Remote: Moving Talent to
                                                                 Middle America." Harvard Business
                                                                 School Case 621-048, September
                                                                 2020. (Revised July 2022.)
 19                         Final
                            presentations
 20                         Final
                            presentations
*Cases written by instructor.

                                                                                                       5$OUTLINE_q9z$),
  ('FSAT', 'Financial Statement Analysis', $OUTLINE_q9z$BITSoM
2 Year Flagship MBA Program

Course Outline
Course Title: Financial Statement Analysis
Faculty: Prof. Prabhu Venkatachalam
Dates: 27th July 2026 – 23rd August 2026

Course Overview and Relevance: This course offers a rigorous framework for analysing a firm’s historical performance, forecasting future outcomes, and valuing its equity. Positioned at the intersection of accounting, finance, economics, and strategy, it emphasises the interpretation of financial statements to inform sound business and investment decisions.
You will develop the analytical tools and judgment required to assess a company's financial health, evaluate its profitability and risk profile, and build logically consistent projections of future performance, including revenues, earnings, asset balances, and free cash flows. By the end of the course, you will be equipped to apply these insights to make well-informed strategic and investment decisions.
Beyond technical proficiency, the course underscores the importance of integrity and diligence in financial analysis. We will explore the consequences of flawed or unethical analysis through the lens of past financial crises and emphasise the broader societal value of transparency and accountability in financial reporting.
In an increasingly complex and dynamic global capital market, this course provides a principled and disciplined approach to understanding the language of business. By integrating prior coursework in accounting and finance with real-world applications, you will be prepared to conduct insightful financial analysis and contribute meaningfully to high-stakes decision-making in your career.

Learning Goals:
	•	Apply a structured framework for business analysis and valuation. You will integrate concepts from accounting, finance, and strategy to systematically assess a business.
	•	Interpret and analyse corporate disclosures and financial statement footnotes. You will develop a strong working knowledge of financial statement filings, including how information is presented in financial statements and the accompanying notes. You'll also learn to identify and assess assets and liabilities not recognised on the balance sheet and evaluate their relevance to firm value.
	•	Calculate, interpret, and apply financial ratios effectively. You will learn to use financial ratios to benchmark firms against industry peers, evaluate performance trends over time, and inform forecasts of future performance.
	•	Assess the impact of accounting distortions on financial statements. You will understand how intentional earnings management or unintentional accounting errors can distort reported income, balance sheet items, and book value and how to adjust for them in your analysis.
	•	Build a framework for forecasting earnings and market reactions. You will learn how to develop forecasts of future earnings and evaluate how the stock market responds to earnings announcements and guidance.
	•	Understand and apply major valuation models. You will learn a valuation framework and develop fluency in switching between discounted cash flow (DCF) and residual income (RI) models, as well as market-based approaches such as price-to-earnings (P/E) and market-to-book (M/B) ratios.

Course Delivery: The course pedagogy will include lectures, cases, discussions, and exercises. We will refer to the book “Equity Analysis and Valuation, 7th edition” by Lundholm and Sloan.

Assessment:
Group Project		35%
Quiz			25%
Final Exam		40%

Topics:
Part 1: Introduction and Business Strategy Analysis
Establish a framework for analysing financial statements, the firm’s strategy, the industry, and macroeconomic factors.
Part 2: Accounting Analysis
Review key accounting concepts, understand how different accounting rules affect ratios, and learn ratio analysis and risk analysis.
Part 3: Financial Analysis
Cash flow analysis, understanding earnings quality and earnings management.
Part 4: Structured Forecasting
Forecasting framework, annual forecasts, interpreting guidance, and analysis of forecasts.
Part 5: Valuation
Understand the cost of capital and valuation models, including DCF, residual income, and valuation ratios.$OUTLINE_q9z$),
  ('BECB', 'Building an E-Commerce Business', $OUTLINE_q9z$BITSOM
                              Building An E-Commerce Business
                                           Course Outline: Draft

Faculty:            Lil Mohan
Dates:              Aug 10 – Aug 23, 2026

1. Introduction:
With about 25% of all retail commerce worldwide now coming from digital, e-commerce is a
significant part of all commercial activity. Also, with the advent of AI – particularly Gen-AI and
Agentic AI, e-commerce itself is transforming at a rapid pace. Today’s successful business managers
are now expected to have a clear understanding of the world of e-commerce, and how to create,
optimize, and run an e-commerce business, in a rapidly transforming AI world.

2. Course Objective:
In this course, students will cultivate a way of thinking that will help them navigate the complex
world of today’s e-commerce business landscape. Specifically, this course focuses on:
    i. obtaining a clear grasp of the e-commerce and quick-commerce business landscape,
    ii. learning how to create an e-commerce business from scratch – including using various AI
        tools and techniques that are essential to stay competitive, and,
    iii. understanding what it takes to grow, maintain, and future-proof that business over time.

I have tailored this course such that students will leave equipped with frameworks, strategies and
techniques that they can apply directly at work today.

3. Learning Outcomes:
Upon successful completion of this course, students will be able to:
    •    understand the different types of e-commerce business models, such as storefronts and
         marketplaces.
    •    understand the various ingredients that make up a functional e-commerce business:
         including the goods & services, the retail front end, the warehousing and fulfillment, the
         supply-chain, the various components of the technology infrastructure including
         E-Commerce platforms, Quick Commerce, ML, Gen-AI & Agentic AI, and other key
         ecosystem components that are needed to make a whole e-commerce business work.
    •    set up a core set of metrics that will track the key drivers of success for any e-commerce
         undertaking. Acting on these metrics will provide the way for e-commerce managers to
         keep the business on track and to accomplish stated business goals.

______
© Lil Mohan 2013-2026        BITSOM: Building An E-Commerce Business                                 Page 1 of 4
Los Altos, CA                     Course Outline & Session Topics                               Draft: 20260506
All rights reserved. No part of this document may be reproduced, distributed, or transmitted in any form or by any
means, including photocopying, recording, or other methods, without the prior written permission from the author
    •    utilize the knowledge that they gain from this course to go off and set up a real-life new
         e-commerce business of their own.

4. Class Format & Learning Methodology:
The course consists of 10 three-hour sessions. The last session is reserved for student project
presentations. Class sessions will be broken up into multiple segments made up of short
presentations (both by me and by student groups), discussions on specific topics, and short in-class
exercises, to analyze and understand concepts, frameworks and strategies.

For each session, there is a set of pre–reading material. I have curated topical content from a wide
array of sources – including blogs, posts, articles, case-studies, book excerpt, and also from my
personal archive of e-commerce related materials.

Student contribution to the in-class discussion in each session is crucial to get the most out of each
class. Prior to every session, students should have read the required readings and come prepared
to discuss the topics in class. I highly recommend that students also read the recommended
readings.

I have laid out below up a few requirements for an effective classroom experience. It is crucial that
students:
    •    attend all 10 sessions
    •    ensure you have read the pre-readings before you come to class,
    •    be in class, on time for each session
    •    sit in the same seat in class every time and prominently display your name,
    •    turn off all laptops and all mobile devices while in class, and
    •    actively engage in class discussions with the rest of the class.

5. Attendance Policy:

Students are required to attend all 10 class sessions. Missing one class will result in a grade
reduction. If you miss two classes, you will be considered out of the course.

6. Course Evaluation:

        Pre-Class Assignment:                                             Individual                10%
        In-Class Contributions:                                           Individual                10%
        In-Class Topic Presentation:                                      Group                     15%
        Final Project – Prototype & Presentation:                         Group                     25%
        Final Exam                                                        Individual                40%

______
© Lil Mohan 2013-2026        BITSOM: Building An E-Commerce Business                                 Page 2 of 4
Los Altos, CA                     Course Outline & Session Topics                               Draft: 20260506
All rights reserved. No part of this document may be reproduced, distributed, or transmitted in any form or by any
means, including photocopying, recording, or other methods, without the prior written permission from the author
Pre-Class Assignment: This is a simple warm-up exercise - to get you thinking about this course
before it begins. You will need to think of a few real life examples of e-commerce businesses that
you like and explain your rationale for why you like them.

In-Class Contributions: You contribute mainly by participating in the actual in-class discussions. I
reserve the right to call on students in class to discuss specific topics and questions.

In-Class Topic Presentation: Various student groups will make short presentations to the rest of the
class on pre-defined topics in each of the class sessions (except in the first session). For the groups
that will present in a particular session, I will provide clear guidelines and materials a couple of days
in advance so that the students can come prepared with relevant presentation material.

Final Concept-Project Presentation: These assignments are designed to test your understanding
of e-commerce concepts and techniques that you have learned in class. Each group will execute a
concept-project, and present their concept during the last class session.

Final Exam: This is a timed, 90 minutes, in-person test that will be scheduled for all students to take
simultaneously in a proctored set up. The best way to ensure good performance in this exam is by
preparing for each of the class sessions, engaging in the in-class discussions, and reading the
required readings and the class notes.

Sessions Topics Detail: (Subject to some potential modification)

 Sess.                Introduction: • Introduction and Course Overview
  01                   Building An
               E-Commerce Business • Understanding The E-Commerce Customer
                                    • Customer Acquisition & Retention In An E-Commerce
                                      Business
                                            • E-Commerce Evolution With Agentic AI
 Sess.       The Marketplace Model • The Marketplace Business Model
  02                       & Selling
                   on Marketplaces • Value Drivers Underlying The Marketplace Model
                                     • The Amazon Marketplace
                                            • Selling on E-Tail vs Selling Via A Marketplace
 Sess.             The End-To-End • E-Commerce Platforms: Front-End & Back-End
  03         E-Commerce Platform;
          Supply-Chain & Fulfillment • Types Of E-Commerce Fulfillment Models
                                     • Quick-Commerce & Dark Stores
                                            • SCM - E-Commerce Ops. vs Traditional Retail
                                            • Challenges With Managing An E-Commerces / Q-
                                              Commerce Supply Chain

______
© Lil Mohan 2013-2026        BITSOM: Building An E-Commerce Business                                 Page 3 of 4
Los Altos, CA                     Course Outline & Session Topics                               Draft: 20260506
All rights reserved. No part of this document may be reproduced, distributed, or transmitted in any form or by any
means, including photocopying, recording, or other methods, without the prior written permission from the author
 Sess.          Designing & Building • E-Commerce Store Product Design
  04                An E-Commerce
                              Store • Understanding Personas & Storyboards
                                     • Arriving At Product Requirements & Feature Sets
                                            • Creating a Functional Product Prototype
                                            • Best Practices In E-Commerce Storefront Design
 Sess.      Increasing E-Commerce • Growing Customers With Digital Marketing - Basic
  05        Conversions With Digital  Philosophy
                          Marketing • Content, Search, & Native Advertising

                                            • Application of Gen-AI in Content, Search, & Advertising
                                            • Social Media, Influencers, & Building Advocacy
 Sess.             Omni-Channel             • A Framework For Omni-Channel Retail Commerce
  06                  Commerce:
                                            • Geo-Fencing and Precise Location Targeting
                   LBM, And The
                  Convergence Of            • How Brick & Mortar Retailers Can Leverage LBM
             E-Commerce & Physical
                                            • A Holistic Strategy For Omni-Channel Commerce
                            Retail
 Sess.        E-Commerce In An AI • Agentic E-Commerce Overview & A New Buyer's
  07         World – Introduction To Journey
              Agentic E-Commerce • Standard Architecture Stack For Agentic Commerce

                                            • How Does The Business Model Evolve
                                            • Managing Trust & How To Win The New Brand
                                              Preference War
 Sess.        Locking In Customers • Personalized E-Commerce: Why and How
  08          With Personalization &
                                       • Recommendation Systems: How They Work
                  Predictive Lifestyle
                          Messaging • AI-Based Recommendation Systems
                                            • Hyper-personalization: Moving Past Recommendation
                                              Engines to Predictive Lifecycle Messaging.
 Sess.         Increasing Overall CLV • Core Retention Framework
  09                 Through Loyalty
                                      • How To Build A Successful Loyalty Program
                  & Agentic AI Based
                           Retention • Agentic AI In Retention & Loyalty
                                            • Strategic Risks With The Agentic Shift
                                            • Course Recap
 Sess.                   Presentations
  10

______
© Lil Mohan 2013-2026        BITSOM: Building An E-Commerce Business                                 Page 4 of 4
Los Altos, CA                     Course Outline & Session Topics                               Draft: 20260506
All rights reserved. No part of this document may be reproduced, distributed, or transmitted in any form or by any
means, including photocopying, recording, or other methods, without the prior written permission from the author$OUTLINE_q9z$),
  ('MHLG', 'Machine Learning', $OUTLINE_q9z$Machine Learning for Business
This course equips students with the analytical tools and managerial intuition required to apply machine learning in real business contexts. Modern firms increasingly compete on data-driven decision-making rather than intuition alone. This course bridges technical modelling and managerial action.
Every session explicitly connects technical concepts to real-world business applications. Through industry use cases, company examples, and managerial discussions, students will develop the ability to see how each ML technique creates tangible business value, from pricing and demand forecasting to customer segmentation, fraud detection, and strategic decision-making.
Students will learn how to frame business problems as machine learning tasks, build predictive models, evaluate their performance, interpret outputs responsibly, and translate analytical insights into strategic recommendations.
The emphasis is on applied learning. Students will build working Python notebooks using industry-relevant tools and will use GitHub Copilot as an AI-assisted coding tool to enhance productivity while maintaining conceptual clarity and academic integrity.
There are no traditional midterm or final exams. Evaluation is based on in class quizzes, individual assignments, and a final group project.
By the end of this course, students will be able to:
	•	Identify and evaluate real-world business applications of ML techniques across industries.
	•	Assess the strategic value and feasibility of deploying ML solutions within an organisation.
	•	Frame business problems as supervised or unsupervised ML tasks.
	•	Build and compare regression, classification, and ensemble models.
	•	Evaluate models using appropriate metrics and cross-validation.
	•	Diagnose overfitting, class imbalance, and bias.
	•	Apply text analytics and clustering for segmentation.
	•	Interpret models using SHAP and explainability techniques.
	•	Reason about fairness, bias, and robustness
	•	Communicate analytical results clearly to managerial audiences.
	•	Use AI coding tools responsibly and effectively.
Course Prerequisites:
	•	Comfort with basic statistics (means, variance, regression).
	•	Willingness to code in Python (prior python knowledge not required).
	•	Analytical curiosity and readiness to engage in applied problem-solving.
	•	Laptop required for all sessions.
Technology Requirement:
This course integrates GitHub Copilot as an AI coding assistant. ( Can use Google Collab )
All students must:
	•	Sign up for the GitHub Student Developer Pack.
	•	Verify student status (verification may take several days).
	•	Activate GitHub Copilot access.
	•	Install VS Code with Copilot extension before Session 1.
Students are strongly encouraged to begin the verification process immediately after enrolling. Responsible use of AI tools and academic integrity expectations will be discussed in class.
Typical Session Structure:
Each session follows a consistent structure designed to integrate technical learning with business thinking:
	•	Quiz (10 min): Short in-class quiz on the previous session’s concepts
	•	Core Concepts & Coding (100 mins): Deep dive into the session’s ML techniques with hands-on Python coding
	•	Business Connect (30 mins): A dedicated segment linking the session’s techniques to real-world business applications. This includes industry use cases, company examples, and a facilitated discussion on how managers can leverage these methods for competitive advantage.
	•	Conceptual Wrap-Up & Preview (15 min): Broader conceptual coverage, key takeaways, and preview of the next session
Session Plan Overview:
Session
Theme & Topics
Quiz
Business Application & Use Case
Assignments
1
Introduction to Machine Learning and Regression

Core (Deep + Coding):
• Linear regression
• Ridge & Lasso
• Bias–variance intuition
Conceptual Framing:
• What ML can/can’t do in business
• Prediction vs inference
• Data pipelines

—
• Zillow’s Zestimate: Predicting home prices using regression to power real estate valuations

• Demand forecasting at Amazon: Using regression to optimize inventory and logistics
—
2
Classification I and Trees & Nearest Neighbors

Core (Deep + Coding):
• Logistic regression
• Decision trees
• Decision thresholds & costs
Conceptual Coverage:
• Support Vector Machines
• KNN
Quiz 1
• Credit scoring at banks: Classifying loan applicants as approve/reject using logistic regression

• Customer churn prediction at telecom firms (e.g., Vodafone, Airtel) using decision trees
—
3
Ensembles I & II: Bagging, Random Forests, Boosting & Stacking

Core (Deep + Coding):
• Random Forest
• Gradient Boosting / XGBoost
• Bootstrap & out-of-bag intuition
Conceptual Coverage:
• AdaBoost
• LightGBM
• Stacking/blending

Quiz 2
• Fraud detection at PayPal: Ensemble models to flag suspicious transactions in real time

• Netflix recommendation engine: Using gradient boosting to improve content suggestions
Assignment 1 Released
4
Neural Networks & Model Evaluation & Selection

Core (Deep + Coding):
• Model evaluation metrics (MSE, RMSE, R², Accuracy, Precision/Recall, F1, ROC-AUC, PR curves)
• k-fold CV
• Hyperparameter search
Conceptual Coverage:
• Perceptron, MLPs
• Forward/backprop intuition
• Avoiding overfitting
Quiz 3
• Healthcare diagnostics: Evaluating model accuracy for disease prediction (e.g., diabetic retinopathy screening)

• Marketing campaign ROI: Selecting the right model to predict customer lifetime value
—
5
Naïve Bayes, Text Models & Clustering I

Core (Deep + Coding):
• Naïve Bayes
• Bag-of-words & TF-IDF
• k-Means clustering
Conceptual Coverage:
• Hierarchical clustering
• Elbow & silhouette
• Spam/sentiment & segmentation cases
Quiz 4
• Brand sentiment analysis: Mining social media reviews for product feedback (e.g., Swiggy, Zomato)

• Customer segmentation at Spotify: Clustering users by listening behaviour for personalized playlists
Assignment 1 Due Assignment 2 Released
6
Clustering II & Dimensionality Reduction

Core (Deep + Coding):
• PCA (intuition + implementation)
• DBSCAN (primary coding focus)
Conceptual Coverage:
• t-SNE & UMAP
• Embeddings
Quiz 5
• Visual product discovery at Pinterest: Using embeddings and dimensionality reduction for image search

• Patient cohort identification in pharma: Reducing high-dimensional clinical data for drug trial targeting
—
7
Association Rule Mining & Data Handling

Core (Deep + Coding):
• Apriori / FP-Growth
• Support, confidence, lift
• Data preprocessing basics
• Market basket case discussion
Conceptual Coverage:
• Missing values & outliers
• Feature selection approaches
Quiz 6
• Market basket analysis at Walmart and BigBasket: Discovering product affinities for cross-selling and store layout

• Flipkart’s “Frequently Bought Together” feature powered by association rules
Assignment 2 Due Project Proposal Due Assignment 3 Released
8
Class Imbalance, Explainability & Fairness

Core (Deep + Coding):
• SMOTE / imbalance handling
• SHAP interpretation
Conceptual Coverage:
• Cost-sensitive learning
• LIME
• Bias & fairness metrics
• Adversarial robustness
Quiz 7
• Lending fairness at HDFC/ICICI: Detecting and mitigating bias in automated loan decisions

• Healthcare AI transparency: Using SHAP to explain cancer risk predictions to doctors and patients
—
9
Time Series, Transfer Learning & The Future of ML

Core (Deep + Coding):
• Forecasting as supervised ML
• Lag features
Conceptual Coverage:
• AutoML, multimodal ML
• Generative AI/LLMs
• Managerial implications

Quiz 8
• Stock price and sales forecasting at Reliance Retail using time-series ML

• GPT/LLM-powered customer service bots at companies like Freshworks: Transfer learning in action
Assignment 3 Due
10
Capstone Case & Final Presentations
• Integrative case
• Model comparison & trade-offs
• Strategic positioning of ML solutions
—
• End-to-end ML deployment case: How Uber uses ML across pricing, ETA, and fraud detection

• Building an ML strategy roadmap: Lessons from Google, Amazon, and Indian startups
Final Group Project Due Project Presentations

Assessment: Maximum Marks 100
Daily In-Class Quizzes: 10%
	•	10-minute quiz at the beginning of Sessions 2–9
	•	Tests conceptual clarity and applied reasoning
	•	Lowest quiz score may be dropped

Class Participation: 10%
	•	Active engagement in coding exercises and class discussions
	•	Contribution to business use case discussions and peer learning
	•	Quality of questions, insights, and analytical contributions

Individual Assignments: 40%
Three business-problem-driven individual assignments, each grounded in a real-world scenario:
	•	Assignment 1: Predicting Customer Churn & Lifetime Value (Regression & Classification)
	•	Assignment 2: Optimizing Marketing Campaign Response (Ensembles & Model Tuning)
	•	Assignment 3: Customer Voice Analytics & Responsible AI (Text, Imbalance & Explainability)

Each assignment requires:
	•	Python notebook submission
	•	Model evaluation and comparison
	•	Managerial recommendation memo with actionable business insights
	•	Disclosure of AI tool usage

Final Group Project & Presentation: 30%
Teams will:
	•	Identify a real business problem
	•	Frame it as an ML task
	•	Build and compare multiple models
	•	Justify metric selection
	•	Provide managerial recommendations

Milestones:
	•	Project Proposal Due: Session 7
	•	Final Submission & Presentation: Session 10

Evaluation Criteria:
	•	Problem framing
	•	Technical rigor
	•	Interpretability and robustness
	•	Managerial clarity

Peer Contribution Review : 10%
Confidential peer evaluation submitted after final presentations. Peer scores may adjust individual project grades to ensure accountability.
Honor Code Classification
Component
Code
In-Class Quizzes
AC-I
Individual Assignments
AC-I
Group Project
AC-V
Participation
AC-V
Peer Review
AC-I
AC-I: No collaboration or external assistance permitted.
AC-V: Collaboration within team permitted; external material allowed with attribution.$OUTLINE_q9z$),
  ('ABMA', 'AI in Business: From Models to Agents', $OUTLINE_q9z$AI in Business: From Models to Agents 2026
BITSoM MBA · Year 2
Instructor: Daniel M. Ringel (UNC Chapel Hill)

Course Title
AI in Business: From Models to Agents (BITSoM MBA, Year 2)

Course Description
This course explains how modern AI creates business value. We move from data to models to deployed assistants and agents. You will learn to prepare unstructured data, evaluate models, and ship AI applications. We emphasize practical use, measured impact, and responsible deployment.

Course Objectives
By the end of the course, you will be able to:
	•	Describe how AI (deep learning, LLMs, genAI, RAG, agentic AI) changes business workflows and decisions.
	•	Build and evaluate AI solutions using vibe coding.
	•	Deploy an AI web application and document it for stakeholders.
	•	Assess opportunities, risks, costs, and guardrails for agentic AI in business.

Course Prerequisites
	•	Curiosity and comfort with messy, unstructured data.
	•	No prior Python required; the course provides a fast ramp‑up.
	•	We use Python, Google Colab, GitHub, Vercel, Pinecone, and serverless models from OpenAI and Anthropic via APIs—to name a few.

Course Materials
	•	No textbook or cases to purchase. Plan to spend ~$50 in API usage.
	•	Required accounts:
	•	Google Drive (free) https://workspace.google.com/products/drive/
	•	Google Colab (free) https://colab.research.google.com/notebooks/intro.ipynb
	•	OpenAI Developer (API cost) https://openai.com/api/
	•	Anthropic Developer (API cost) https://platform.claude.com/
	•	GitHub (free) https://education.github.com/discount_requests/application
	•	Vercel (hobby) https://vercel.com/signup
	•	Pinecone (starter) https://login.pinecone.io/login
	•	Exa (API cost) https://exa.ai/
	•	Privacy note: If you prefer to keep your google drive isolated from this course, use a separate Google account or a dedicated Drive folder for Colab.

Course Delivery
	•	Interactive lectures. Concepts tied to concrete business use cases.
	•	Hands‑on labs. Short guided builds in Colab and GitHub.
	•	Applied projects. Automation, analytics, retrieval (RAG), and deployment.
	•	Capstone. A functional AI-powered App that you deployed publicly to the web.

Schedule (tentative): Aug 31 – Sep 11
Session 1 (Mon) — Part 1: AI for Business: Quo Vadis? Prep: Read McKinsey/QuantumBlack, From promise to impact: How companies can measure—and realize—the full value of AI (report). Part 2: Hands-on cloud computing with Google Colab
Session 2 (Tue) — Vibe coding done right: where it helps, where it fails. Prep: Read “Your brain on ChatGPT: Accumulation of cognitive debt when using an AI assistant for essay writing task” https://doi.org/10.48550/arXiv.2506.08872
Session 3 (Wed) — Generative AI at scale for analytics and applications: OpenAI / Anthropic (API) platform, authentication, queries, models, parameters.
Session 4 (Thu) — RAG and vector databases (Pinecone): Injecting truth into GenAI.
Session 5 (Fri) — Building a Chatbot: From backend to frontend to web deployment (GitHub, Vercel, Pinecone, Exa web search).
MIDTERM EXAM (Friday after class – Monday before class)
Session 6 (Mon) — Synthetic Data and Digital Twins
Session 7 (Tue) — Introduction to Agentic AI: automated LinkedIn posts on breaking news. Prep: Read “Regulating advanced artificial agents.” http://aima.cs.berkeley.edu/~russell/papers/science24-LTPA.pdf
Session 8 (Wed) — Autonomous Agents: Introduction to OpenClaw
Session 9 (Thu) — Beautiful Liars: LLMs in Business
Session 10 (Fri) — Smarter, cheaper, greener: vertical AI for business analytics. Course wrap‑up. Prep: Read “Creating Synthetic Experts with Generative Artificial Intelligence” http://dx.doi.org/10.2139/ssrn.4542949
CAPSTONE Team Assignment (due by end of the course)

Assessments
Midterm (Individual)
Out: Friday (after class) · Due: Monday (before Session 6).  Build and deploy a working AI assistant on a chosen business topic. Deliverables include:
	•	Problem statement, user, and value proposition.
	•	Knowledge base (RAG/embeddings) and configuration.
	•	Safety features (intent checks, filters as relevant).
	•	Documentation: purpose, audience, data/knowledge sources, features, UI choices, behavior, and limits.
	•	Private GitHub repo with code and docs shared with instructor/TA.
Capstone (Team)
Out: Start as early as Session 6 · Due:  by end of course.
Teams of 4 students develop an AI powered product/solution/tool of their choice based on what they’ve learnt in this course. Deliverables include:
	•	Problem statement, users/audience, unique value proposition, market potential, competition.
	•	Private GitHub repo with code and technical docs (readme, quick start, setup) shared with instructor/TA.
	•	Working demo that instructor/TA can assess / demo video
	•	Critical reflection on the way forward for the developed product/solution/tool

Active Class Participation
Participation is graded on quality, not volume. Evidence includes:
	•	Prepared contributions in discussions and case debriefs.
	•	Collaboration and constructive peer feedback in labs and demos.
	•	Clear communication and professionalism.

Active participation is not equivalent to being physically present, taking notes, running code, or trying to listen to the lecture.
Operational notes on active class participation:
	•	Sit in the same seat and display a legible name card for tracking.
	•	Be ready for cold calls and quick shares of lab results.
	•	Be on time: arrive at least 3 minutes before a lecture starts and return to your seat from breaks at least 1 minute before the break ends.

Grading
	•	Midterm: 33%
	•	Active class participation: 33%
	•	Capstone: 33%
Final grades will be based on (a) students’ baseline letter grades, (b) the grades of their fellow students, and (c) the instructor’s considered judgment.

Course Policies
	•	GenAI use. You may use LLMs for coding assistance and drafting with disclosure in notebooks/READMEs. Cite AI‑generated text or code of substance.
	•	Academic integrity. Use only approved data and tools. Attribute sources. No sharing of graded work.
	•	Privacy and safety. Avoid uploading sensitive or personal data to third‑party services. Use course‑scoped folders and keys.
	•	Late work. This is a compact course. No late submissions will be accepted. Work that is not tuned in by its deadline receives an F (fail).$OUTLINE_q9z$),
  ('PDMT', 'Product Management', $OUTLINE_q9z$BITS SCHOOL OF MANAGEMENT
                                     Term _____, Block ______
                                            Course Outline

Course Title: Product Management
Faculty: Dr Srinivas Pingali
Dates: 14-09-2026 to 25-09-2026
Contact details: srinivas.pingali@bitsom.edu.in
Academic Associate: ______ Contact details: ______
Office Hours: Wed/Fri 6-7 pm

Course Description:
This is an introductory course on Product Management with a focus on digital products. The role of a
Product Manager (PM) has expanded significantly in scope over the last two decades. The role grew
from managing products to managing services. It grew from managing physical to technology and digital
products. Product Management strategies once confined mainly to business-to-consumer products are
now being used for Business-to-Business products. From managing products that were primarily
“pipeline,” there is a need to manage platforms. Technology has started to play a significant role in the
development of products and services. The digital era also saw the drastic reduction of product
lifecycles, and PMs need to be nimble to meet the constantly changing landscape and customer needs.
Concepts such as lean, agile and design thinking have risen to prominence. Today, the role of a PM is
very diverse and confusing. A PM is expected to be an all-rounder who can multi-task while possessing
specialist skills and knowledge. Companies have developed varying definitions and expectations of a
PM. In some companies, the role continues to be market-focused; in others, there is a greater focus on
technology skills. Terms such as Product Manager, Program Manager, Brand Manager, and Technical
Product Manager are often used interchangeably. This course helps demystify all the above and helps
define the role of a modern Product Manager and ties together all the skills and knowledge required to
be an effective Product Manager in the digital era. The course is structured around five modules:
Discover, Define, Deliver, Growth, and Leadership.

Course Materials:
Required: Product Management in the Digital Era: Theory and Practice (Pingali, Prakash, Pedada,
Korem)

POLICY:
Class Policies
 • We will start classes on time.
 • If you are late, the instructor has the choice of not allowing you to attend or creating creative
   punishments for tardiness.
Attendance Policy
The attendance policy as laid out by the Programme Office applies. Please refer to your student
handbook for details.
Honour Code
BITSoM takes the honour code seriously, and so should you. The student handbook contains details on
the honour code policy at BITSoM. You are expected to abide by an honour code and follow a culture
of honesty. Please ensure that you read the relevant section(s) in the handbook. Feel free to ask us in
case you have any questions.
Coding scheme for all course work:

 Code            Nature of Course Work                     Nature of Reference Material
                       Discussion

           General             Specific            External            Case/Problem Solutions
           Discussions         Discussions         Material

 AC-I      Not Allowed         Not Allowed         Not Allowed         Not Allowed

 AC-       Allowed             Not Allowed         Not Allowed         Not Allowed
 IIa

 AC-       Not Allowed         Not Allowed         Allowed             Not Allowed
 IIb

 AC-       Allowed             Allowed             Not Allowed         Not Allowed
 IIIa

 AC-       Allowed             Not Allowed         Allowed             Not Allowed
 IIIb

 AC-       Not Allowed         Not Allowed         Allowed             Allowed
 IIIc

 AC-       Allowed             Allowed             Allowed             Not Allowed
 IV

 AC-V      Allowed             Allowed             Allowed             Allowed

Honor code by component:

 Component                    Honor Code

 In-Class Assignments         AC-IIIa

 Final Presentations          AC-IV

 End term exam                AC-I

 Class participation          AC-I
Course Schedule

 Session   Date             Session Content                                          Reading / Simulation

                                    MODULE 1 — FOUNDATION

 1.1       14/09/26 (Mon)   Introduction                                             Chapter 1
                             • Introduction to Product Management
                             • Product vs Project vs Program Management
                             • Product vs Service Management
                             • Digital vs other Product Management
                             • Roles and Responsibilities
                             • Organization Structures

 1.2       14/09/26 (Mon)   “Day in the life of a PM” simulation                     Simulation will be
                            • Each team is assigned a real PM job description        provided by faculty
                            • Role-play 5 inbound requests from Eng, design,
                              sales, CEO, customer etc.
                            • Teams triage, draft responses, and justify their
                              priorities

                                      MODULE 2 — DISCOVER

 2.1       15/09/26 (Tue)   Market and Product Planning                              Chapter 2
                            • The 2-Cycle framework
                            • Product Development
                            • Product Marketing
                            • Product Development Framework

 2.2       15/09/26 (Tue)   Market Scanning and Idea Generation                      Chapter 3
                            • Macro and Microenvironments
                            • Defining competition
                            • Competition Scanning
                            • Market Gaps
                            • Idea Generation

 3.1       16/09/26 (Wed)   Group Exercise — Market Scan & Ideation                  LLM will be provided
                             • Conduct a market scan for an assigned Indian          by faculty
                               product market using PESTLE and Porter’s Five
                               Forces to surface fast-moving signals and
                               competitive dynamics
                             • Build a 2x2 competition map of 7–10 real players to
                               identify white space
                             • Each team produces three signal-anchored product
                               ideas; class votes on most defensible, most
                               surprising, and riskiest
                            One idea will be carried through the course till the
                            final project
Session   Date             Session Content                                          Reading / Simulation

3.2       16/09/26 (Wed)   Product Proposition and Feasibility                      Chapter 4
                           • TBD Framework                                          Avika Mind Health
                           • Value Proposition                                      Case (ISB533-PDF-
                           • Business Model Canvas                                  ENG)

                                       MODULE 3 — DEFINE

4.1       17/09/26 (Thu)   Product Design                                           Chapter 5
                           • What is good design?                                   Avika Mind Health
                           • UX/UI Design Frameworks                                Case (ISB533-PDF-
                                                                                    ENG)

4.2       17/09/26 (Thu)   Figma + FigJam — Competitive Design Sprint               Class Exercise
                           • Continue with the idea generated in Session 3.1
                           • 90-min in-class sprint: empathy map → problem
                             statement → 5 sketches → 1 wireframe
                           • Teams present in last 20 min; class votes via FigJam
                             stickies

5.1       18/09/26 (Fri)   PM Communication Artifacts                               In-class drill: Each
                           • Writing Product Requirements Documents (PRDs)          team writes a one-
                           • One-pagers and decision documents                      page PR/FAQ for their
                           • The Amazon PR/FAQ method as a forcing function         Session 3.1 idea
                             for clarity
                           • OKRs and goal-setting documents
                           •

5.2       18/09/26 (Fri)   Digital Product Development                              Chapter 6
                           • Converting a product strategy to product roadmap       Dropbox: ‘It Just
                           • Feature prioritisation                                 Works’ (811065-PDF-
                           • Prototyping and MVP – LC/NC tools                      ENG)
                           • Technology Selection                                   HubSpot: Minimum
                           • Testing and Quality                                    Viable Product
                           • Deployment and Launch
                           • Product Life Cycle Management

5.3       Weekend          Lovable: Ship a Working MVP                              Lovable AI app
          Assignment       • Teams start from their Session 3.1 problem             builder
                             statement
                           • AI app builders generate a functional web MVP
                             from text prompts
                           • Required output: live URL, 1 working core feature,
                             1 sign-up form

                                      MODULE 4 — DELIVER

6.1       21/09/26 (Mon)   Live demo round in first 30 min                          Chapter 13
                           Digital Project Management                               Facilitating Digital
                           • Program vs Project Management                          Development with
                                                                                    Agile User Stories
                           • Scope, schedule, cost, stakeholder management
                                                                                    (UV8711-PDF-ENG)
                           • Agile methodologies, user stories
Session   Date             Session Content                                           Reading / Simulation

                           • Working effectively with engineering

6.2       21/09/26 (Mon)   Roadmap & Sprint Planning                                 Each team gets a free
                           • Build a 6-month roadmap and 2-sprint backlog for        Jira and Notion or
                           their Session 5.3 MVP                                     Linear workspace

7.1       22/09/26 (Tue)   Data Driven Decision Making & PM Metrics                  Chapter 7
                           • Scoping and sourcing data                               Oracle: Structured vs
                           • Product metrics fundamentals                            Unstructured Data
                           • AARRR metrics
                           • Activation vs retention vs revenue metrics
                           • PM performance metrics: how PMs measure their
                             own success, OKR setting, what “good” looks like in
                             the role

7.2       22/09/26 (Tue)   PostHog — Live Funnel Investigation                       Class Exercise
                           • Free-tier dashboards pre-loaded with sample data
                           • Each team investigates a sudden drop in conversion
                             — must produce 3 hypotheses
                           • Run cohort and funnel analysis live; present findings

7.3       22/09/26 (Tue)   Revenue Forecasting & Feasibility                         Avika Mind Health
                           • Product Feasibility Analysis                            Case Lecture Notes
                           • Revenue Forecasting                                     and Xls

                                      MODULE 5 — GROWTH

8.1       23/09/26 (Wed)   Marketing Enablement                                      Chapter 9
                           • Dolan Framework
                           • Segmentation-Targeting-Positioning
                           • 5Cs - 4Ps

8.2       23/09/26 (Wed)   Accelerating and Protecting Growth                        Chapter 15
                           • Growth Hacking
                           • Growth Loops
                           • Hyperscaling

                                   MODULE 6 — LEADERSHIP

9.1       24/09/26 (Thu)   Ethics, Sustainability & IP Protection                    Chapter 14
                           • Responsible product management                          HBP Organizational
                           • Ethical AI in product decisions                         Behavior — Judgment
                           • Sustainable / circular product design                   in a Crisis (team play)
                           • DPDP Act, dark patterns regulation in India             HBP 7077-HTM-ENG
                           • IP Protection

9.2       24/09/26 (Thu)   Mock Interviews                                           Class Exercise

10        25/09/26 (Fri)   Final Presentations                                       Group Presentations
Grading

 Component              Individual/Group   Marks

 In-class Assignments   Group              20%

 Class Contribution     Individual         20%

 Final Presentation     Group              30%

 Final Exam             Individual         30%$OUTLINE_q9z$),
  ('MHPT', 'Managing High Performance Teams', $OUTLINE_q9z$BITS SCHOOL OF MANAGEMENT
Term 4, 2026 - 27
Course Outline

Course Title: Managing High Performance Teams

Faculty: Dr. Pooja Mishra

COURSE OVERVIEW

Good teams are built, not found. They emerge from a small set of design choices that most leaders never realise they are making, about composition, about how disagreement is handled, about how decisions are taken, about what counts as failure and what counts as learning. This course is about those choices, and how to make them well. Almost every job you hold for the rest of your career will be done in or through teams. The tools to design and lead them well exist, but they are scattered across forty years of academic research and rarely arrive in the popular literature unbroken. This course will give you the foundations directly. We will spend our time on the unglamorous, decisive question of what good team design looks like in practice, paired with real stories from settings where the consequences of team performance can actually be measured — operating rooms, cockpits, Formula 1 garages, scientific collaborations, an unusually well-run dabba delivery system in Mumbai.

The course is delivered as ten three-hour sessions across two weeks. The sessions follow the lifecycle of a team, from the conditions before it forms, through composition and launch, into the work the team does together (making decisions, generating ideas, learning from failure), into the team's environment (distributed work, the introduction of AI tools), and finally to the leadership of multiple teams. Each session builds on the previous one and leaves you with a portable analytical or practical tool.
By the end of this course, you should be able to:
•   Diagnose a team's design and process against research-grounded criteria of effectiveness, and identify its likely failure modes
•   Design team composition, task structure, and reward systems to align with the work the team has to do
•   Build psychological safety and structure productive disagreement in teams you lead or join
•   Run decision-making and ideation protocols that reduce common group-level biases
•   Lead distributed and hybrid teams using evidence-based practices for asynchronous coordination
COURSE FORMAT
Each three-hour session combines case discussion, structured exercises, and applied work. Several sessions involve team-based exercises where students will be observed and recorded so that their own behaviour becomes part of the material the course examines. Pre-class readings should be completed before the session. Post-class readings extend the session's themes for those who wish to go further.
Because the course runs across two consecutive weeks rather than a full term, the team you form in Session 2 will work together intensively across all ten sessions on the Live Team Project. Much of the course's value comes from your team experiencing, in real time, the dynamics the course teaches.

Course Materials: All readings (journal articles, HBS cases, book chapters) are included in the course pack and made available through the learning management system. The primary textbook is Thompson, L. L. (2018). Making the Team. A list of recommended further reading appears at the end of this outline.

COURSE REQUIREMENTS AND GRADING
Your focus in this course should be on learning rather than on the grade you receive. If you learn, the grade will follow. The assessment scheme below is designed to reward applied teamwork The Live Team Project, worth 35%, runs across the two weeks and is the spine the rest of the course revolves around.

Component
Weight
Type
Honor Code
1. Class Participation
30%
Individual
AC-V
2. Team Charter
10%
Group
AC-IIIa
3. Live Team Project
35%
Group
AC-IV
4. Team Check-Ins (mid-term & final)
10%
Individual
AC-I
5. Peer Assessment (multiplier 0.85–1.15)
15%
Individual
AC-I

1. Class Participation (30%) Honor Code: AC-V
This course is largely an experiential learning course and therefore being present in class thoroughly prepared for the exercises and cases is of utmost importance Attendance is necessary but not sufficient. Participation is assessed against pre-published rubric weighting insight, evidence, and constructive engagement with peers' arguments. For every session that you attend, you get 1% of grade (10% for attending 10 sessions).  If you are not in the class in any sessions (for any reason), you don’t get this 1% for that particular session. Attendance in my class is very important for your learning. In addition, to effectively manage course logistics and to ensure that other students’ experience with in-class exercises is not significantly affected, you will be required to inform the concerned Academic Associate via email 48 hours in advance of class if you are missing a particular session. If you fail to do so, additional penalties will apply that will significantly reduce your class participation grade. The other 20% of this component will come from assessment of your preparation for the cases.  In this class you will learn from your instructor and from your classmates; as such it is critical to make substantive contributions to class discussions. Your participation in class discussion will be evaluated on the quality of your contributions and insights and your preparedness for the negotiation case. Please note that certain behaviours in the classroom impede the learning of other students. These include 1) participating in private conversations with your neighbour during class time, 2) consistently showing up late to class, or late from break, 3) using a mobile phone in class, and 4) using a laptop during lecture time (you are welcome to use them for simulations if required). Being attentive in class is part of class participation. You will lose points from your overall score if you violate any of these rules in a particular session.

2. Team Charter (10%) Honor Code: AC-IIIa
Following the team-launch session in Session 3, each team submits a 1,500-word team charter applying Hackman's launch framework to their own team. The charter specifies the team's compelling direction, its enabling structure, its norms of conduct, and the supportive context the team will create for itself. The charter is submitted by the start of Session 4 and is the team's working document for the rest of the course.

4. Live Team Project (35%) Honor Code: AC-IV
The capstone of the course. Each team selects a real, accessible team - a startup, a non-profit, a sports team, a college committee, a small department within a known organization, and conducts a structured diagnosis using the frameworks from each session. The work runs across both weeks of the course:
•   Session 2 onwards: each team identifies a candidate organisation and arranges access
•   Wednesday of Week 1: each team conducts a 30-minute diagnostic conversation with the chosen team's leader (recorded with consent)
•   Across the two weeks: each session's frameworks are applied to the chosen team in a working analysis
•   Session 10: each team presents a 10-minute live diagnosis to the class, with the chosen team's leader invited to attend if possible

Final deliverables (due by the end of Session 10): a 2,000-word diagnostic memo addressed to the team's leader, identifying design weaknesses and recommending specific interventions grounded in course concepts (20 marks); and the 10-minute live presentation (15 marks). Both will be discussed in the final session.

5. Team Check-Ins (10%) Honor Code: AC-I
Two short, structured questionnaires submitted privately to the instructor, one after Session 5 (mid-course) and one after Session 10 (end of course). Each asks four specific questions about your team in 200 words: what is working, what is not, what you have personally contributed, what you will change. The check-ins are graded only on whether they are submitted thoughtfully and on time — the content remains confidential. Their purpose is twofold: to give you a structured moment to notice what is happening on your team, and to give the instructor diagnostic information across the cohort.

6. Peer Assessment (15%) Honor Code: AC-I
Confidential end-of-course peer ratings within each team, applied as a multiplier of 0.85 to 1.15 against the team-based components of your grade (the Team Charter, and the Live Team Project). The multiplier mechanics will be published at the start of the term. With the team-based components carrying 60% of the grade and a multiplier range of 0.85–1.15, this is a serious accountability mechanism.

IMPORTANT NOTES
Roles, scenarios, and team-specific materials assigned for in-class exercises are confidential and should not be shared or discussed with students outside your team during the exercise window.
Late submissions will be penalised at the discretion of the instructor.

The honour-code coding scheme used in this course follows BITS convention. The codes for each assessment component are tagged in the heading of each component above. Students are responsible for submitting original work that reflects their own effort and interpretation.

Generative AI tools may be used for background reading, brainstorming, and editing. Final submitted analysis, judgement, and writing must be your own. Substantive use of such tools must be disclosed in a brief methods note appended to the relevant submission.

POLICY:

Class Policies
     We will start classes on time.
     If you are late, the instructor has the choice of not allowing you to attend or creating creative punishments for tardiness.

Attendance Policy
The attendance policy as laid out by the Programme Office applies. Please refer to your student handbook for details.

Honour Code
BITSoM takes the honour code seriously, and so should you. The student handbook contains details on the honour code policy at BITSoM. You are expected to abide by an honour code and follow a culture of honesty. Please ensure that you read the relevant section(s) in the handbook. Feel free to ask us in case you have any questions.

Coding scheme for all course work:

Code
Nature of Course work Discussion
Nature of Reference Material

General Discussions
Specific Discussions
External Material
Case/Problem Solutions
AC-I
Not Allowed
Not Allowed
Not Allowed
Not Allowed
AC-IIa
Allowed
Not Allowed
Not Allowed
Not Allowed
AC-IIb
Not Allowed
Not Allowed
Allowed
Not Allowed
AC-IIIa
Allowed
Allowed
Not Allowed
Not Allowed
AC-IIIb
Allowed
Not Allowed
Allowed
Not Allowed
AC-IIIc
Not Allowed
Not Allowed
Allowed
Allowed
AC-IV
Allowed
Allowed
Allowed
Not Allowed
AC-V
Allowed
Allowed
Allowed
Allowed

COURSE SCHEDULE
The schedule below lists the topic, in-class activity, preparation required for the next session, and post-class readings for each session. Citations in the schedule are abbreviated; full references appear in the Recommended Reading list at the end of this outline.

Session
Topic
During Class
To-do After Class
To-read After Class
Session 1
Foundations: What constitutes a team
Introduction to the course
Case discussion: a 1996 Mount Everest expedition
In-class exercise: NASA Lost on the Moon
Read for Session 2
Think about candidate organisations for the Live Team Project
Hackman: Leading Teams, Ch. 1
Thompson: Making the Team, Ch. 1–2
Roberto: Lessons from Everest
Coutu & Beschloss: Why Teams Don't Work (HBR)
Session 2
Composition and structure: who is on the team and why
Form course teams (self-selected, 4–5 members)
First video-recorded team exercise
Discussion: diversity, faultlines, and when composition helps versus hurts
Confirm team membership
Identify candidate organisation for Live Team Project
Read for Session 3
Lau & Murnighan: Demographic diversity and faultlines
van Knippenberg & Schippers: Work group diversity
Stasser & Titus: Pooling of unshared information
Thompson: Making the Team, Ch. 3
Phillips: How diversity makes us smarter (Sci. Am.)
Session 3
Tasks, rewards, and the team launch
Case discussion: Aravind Eye Care
Application: drafting your team launch charter
Discussion: task interdependence and team-based reward systems
Submit Team Charter (1,500 words) by start of Session 4
Arrange diagnostic conversation with chosen organisation for Live Team Project
Read for Session 4
Wageman: Interdependence and group effectiveness
DeMatteo, Eby & Sundstrom: Team-based rewards
Katzenbach & Smith: The Discipline of Teams (HBR)
Thompson: Making the Team, Ch. 4
Bock: Work Rules!
Session 4
Psychological safety and the conditions for speak-up
Case discussion: error reporting in a children's hospital
Application: rewriting a real meeting using framing-the-work language
Discussion: speak-up failures in aviation (KAL 801) and what changed
Conduct Live Team Project diagnostic conversation (Wed of Week 1)
Read for Session 5
Edmondson (1999): Psychological safety and learning behavior in work teams
Edmondson (1996): Learning from mistakes is easier said than done
Edmondson: The Fearless Organization, Ch. 2 & 6
Delizonna: High-Performing Teams Need Psychological Safety (HBR)
Frazier et al.: Psychological safety meta-analysis
Session 5
Conflict and productive disagreement
Discussion: institutionalised disagreement practices (Pixar Braintrust)
Structured productive-disagreement protocol exercise
Submit mid-term Team Check-In (200 words, individual)
Apply session frameworks to Live Team Project analysis
Read for Session 6
Jehn (1995): A multimethod examination of intragroup conflict
de Wit, Greer & Jehn (2012): The paradox of intragroup conflict
Catmull: Creativity, Inc., Ch. 5
Thompson: Making the Team, Ch. 8
Bradley et al. (2012): Reaping the benefits of task conflict
Hastings & Meyer: No Rules Rules (selected chapters)
(continued)

Session
Topic
During Class
To-do After Class
To-read After Class
Session 6
Creativity, innovation, and brainstorming
Group ideation exercise across three conditions (traditional brainstorming, nominal group technique, AI-augmented ideation)
Debrief and case discussion: Mars Pathfinder
Continue Live Team Project field work
Read for Session 7
Mullen, Johnson & Salas: Productivity loss in brainstorming groups (meta-analysis)
Sutton & Hargadon: Brainstorming groups in context (IDEO)
Thompson: Making the Team, Ch. 9
Paulus & Yang: Idea generation in groups
Session 7
Team decision making and failing well
Case discussion: Columbia's Final Mission
Application: Edmondson's failure typology (basic, complex, intelligent failure)
Premortem exercise on the Live Team Project
Conduct premortem on Live Team Project diagnosis
Read for Session 8
Stasser & Titus: Hidden profiles, a brief history
Klein: Performing a project premortem (HBR)
Edmondson: Right Kind of Wrong, Ch. 1 & 4
Thompson: Making the Team, Ch. 7
Roberto & Edmondson: Columbia's Final Mission (HBS case)
Session 8
Distributed and hybrid teams
Case discussion: the Mumbai dabbawalas
Application: designing an asynchronous operating protocol
Discussion: building mutual knowledge across distance
Draft Live Team Project memo
Read for Session 9
Cramton: The mutual knowledge problem
Choudhury, Foroughi & Larson: Work-from-anywhere
Thompson: Making the Team, Ch. 13
Haas: 5 Challenges of Hybrid Work (HBR)
Watkins: Making Virtual Teams Work (HBR)
Session 9
The new teammate: working with machines
Discussion: what changes when a team adds an AI member
Segment: human-AI calibration — over-trust, under-trust, and the new mutual-knowledge problem
Second video-recorded team exercise; team self-critique against Session 2 recording
Finalise Live Team Project deliverables
Read for Session 10
Dell'Acqua et al.: Navigating the Jagged Technological Frontier (HBS WP)
Doshi & Hauser: Generative AI and collective creative diversity (Sci. Adv.)
Dietvorst, Simmons & Massey: Algorithm aversion
Logg, Minson & Moore: Algorithm appreciation
Yang et al. (Microsoft): Effects of remote work on collaboration
Session 10
Leading a team of teams: course synthesis and capstone
Live Team Project presentations (10 minutes per team)
Case discussion: cross-organisational coordination (Mercedes-AMG Petronas Formula 1)
Closing synthesis: established versus contested propositions in the team-effectiveness literature
Submit final Team Check-In (200 words, individual)
Submit Live Team Project memo (2,000 words)
Ancona & Caldwell: Bridging the boundary
Edmondson & Harvey: Cross-boundary teaming for innovation
Wolff: The Mercedes Formula 1 Team's Approach to High Performance;
Wageman, Fisher & Hackman: Leading teams when the time is right
Hackman: Six common misperceptions about teamwork

RECOMMENDED READINGS

The course pack contains all required readings. The following books and longer works are recommended for those who wish to go deeper. Full citations for journal articles and HBS cases used in the course schedule are available on the learning management system.

•   Bock, L. (2015). Work Rules! Insights from Inside Google That Will Transform How You Live and Lead. New York: Twelve.

•   Catmull, E. (2014). Creativity, Inc.: Overcoming the Unseen Forces That Stand in the Way of True Inspiration. New York: Random House.

•   Coyle, D. (2018). The Culture Code: The Secrets of Highly Successful Groups. New York: Bantam.

•   Edmondson, A. C. (2012). Teaming: How Organizations Learn, Innovate, and Compete in the Knowledge Economy. San Francisco: Jossey-Bass.

•   Edmondson, A. C. (2018). The Fearless Organization: Creating Psychological Safety in the Workplace for Learning, Innovation, and Growth. Hoboken: Wiley.

•   Edmondson, A. C. (2023). Right Kind of Wrong: The Science of Failing Well. New York: Atria Books.

•   Hackman, J. R. (2002). Leading Teams: Setting the Stage for Great Performances. Boston: Harvard Business School Press.

•   Hastings, R., & Meyer, E. (2020). No Rules Rules: Netflix and the Culture of Reinvention. New York: Penguin.

•   Sutton, R. I., & Rao, H. (2024). The Friction Project: How Smart Leaders Make the Right Things Easier and the Wrong Things Harder. New York: St. Martin's Press.

•   Thompson, L. L. (2018). Making the Team: A Guide for Managers (6th ed.). Boston: Pearson.$OUTLINE_q9z$)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name, content = EXCLUDED.content, updated_at = now();
