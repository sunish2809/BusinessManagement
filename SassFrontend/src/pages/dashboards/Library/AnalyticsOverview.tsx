import React, { useEffect, useState } from "react";
import FusionCharts from "fusioncharts";
import Charts from "fusioncharts/fusioncharts.charts";
import ReactFusioncharts from "react-fusioncharts";
import FusionTheme from "fusioncharts/themes/fusioncharts.theme.fusion";
import { format, isValid, parse, parseISO } from "date-fns";
import axios from "axios";

ReactFusioncharts.fcRoot(FusionCharts, Charts, FusionTheme);

const Analytics = () => {
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [analyticsData, setAnalyticsData] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalRevenue: 0,
    newMembersThisMonth: 0,
    membershipDistribution: {
      basic: 0,
      standard: 0,
      premium: 0,
      annual: 0,
    },
  });
  
  

  const [chartConfigs, setChartConfigs] = useState<any>({
    totalMembers: {},
    revenue: {},
    membershipDistribution: {},
    newMembers: {},
    monthlyPaymentTrends: {},
  });

  const parseDate = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day); // Months are 0-based in JavaScript
  };
  

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token"); // Retrieve token from local storage
        const response = await axios.get(
          "http://localhost:3000/api/library/get-all-members",
          {
            headers: {
              Authorization: `Bearer ${token}`, // Add token to headers
            },
          }
        );

        const apiMembers = response.data.map((member: any) => ({
          id: member.seatNumber,
          name: member.name,
          memberNumber: member.seatNumber,
          email: member.email,
          phone: member.phone || "",
          package: member.membershipType,
          amount: member.paymentHistory.reduce(
            (sum: number, payment: any) => sum + payment.amount,
            0
          ),
          paymentDate: member.paymentHistory[0]?.paymentDate
            ? (() => {
                const parsedDate = new Date(
                  member.paymentHistory[0].paymentDate
                );
                return isValid(parsedDate)
                  ? format(parsedDate, "dd/MM/yyyy")
                  : "N/A";
              })()
            : "N/A",
          status: member.paymentHistory[0]?.paymentDate
            ? (() => {
                const lastPaymentDate = new Date(
                  member.paymentHistory[0].paymentDate
                );
                const expiryDate = new Date(lastPaymentDate);
                expiryDate.setDate(lastPaymentDate.getDate() + 30);

                return new Date() > expiryDate ? "Inactive" : "Active";
              })()
            : "Not Active",
          // joinDate: member.joinDate || "N/A", // Replace with actual data if available
          joinDate: member.createdAt
            ? new Date(member.createdAt).toLocaleDateString()
            : "N/A",

          avatar: `https://avatar.iran.liara.run/public/boy?username=${member.name.replace(
            " ",
            ""
          )}`,
        }));
        console.log("api",apiMembers)
        

        const years = [
          ...new Set(
            apiMembers
              .filter((member: { paymentDate: { raw: string | null } }) => {
                return member.paymentDate; // Ensure raw date exists
              })
              .map((member: { paymentDate: { raw: string } }) => {
                const rawDate = member.paymentDate;
                const parsedDate = parse(rawDate, "dd/MM/yyyy", new Date()); // Correctly parse DD/MM/YYYY
                return isValid(parsedDate) ? parsedDate.getFullYear() : null; // Extract year if valid
              })
              .filter((year: number | null) => year !== null) // Remove invalid years
          ),
        ].sort((a, b) => a - b);

        setAvailableYears(years);

        

       

        // Process analytics data
        const totalMembers = apiMembers.length;
        const activeMembers = apiMembers.filter(
          (member: { status: string }) => member.status === "Active"
        ).length;
        const totalRevenue = apiMembers.reduce(
          (sum: any, member: { amount: any }) => sum + member.amount,
          0
        );

        const membershipDistribution = {
          basic: apiMembers.filter(
            (member: { package: string }) => member.package === "Basic"
          ).length,
          standard: apiMembers.filter(
            (member: { package: string }) => member.package === "Standard"
          ).length,
          premium: apiMembers.filter(
            (member: { package: string }) => member.package === "Premium"
          ).length,
          annual: apiMembers.filter(
            (member: { package: string }) => member.package === "Annual"
          ).length,
        };

        

        const newMembersThisMonth = apiMembers.filter(
          (member: { paymentDate: string | number | Date }) => {
            if (!member.paymentDate) return false; // Skip if paymentDate is missing
        
            const joinDate = parseDate(member.paymentDate);
        
            if (isNaN(joinDate.getTime())) {
              console.error("Invalid Date Format:", member.paymentDate);
              return false;
            }
        
            const currentDate = new Date();
            return (
              joinDate.getMonth() === currentDate.getMonth() &&
              joinDate.getFullYear() === currentDate.getFullYear()
            );
          }
        ).length;
        
        
        // Update state
        setAnalyticsData({
          totalMembers,
          activeMembers,
          totalRevenue,
          newMembersThisMonth,
          membershipDistribution,
        });


        // Update chart configurations
        setChartConfigs({
          totalMembers: {
            type: "column2d",
            width: "100%",
            height: "400",
            dataFormat: "json",
            dataSource: {
              chart: {
                caption: "Total Members",
                theme: "fusion",
              },
              data: [{ label: "Members", value: totalMembers }],
            },
          },
          revenue: {
            type: "column2d",
            width: "100%",
            height: "400",
            dataFormat: "json",
            dataSource: {
              chart: {
                caption: "Total Revenue",
                theme: "fusion",
              },
              data: [{ label: "Revenue", value: totalRevenue }],
            },
          },
          membershipDistribution: {
            type: "pie3d",
            width: "100%",
            height: "400",
            dataFormat: "json",
            dataSource: {
              chart: {
                caption: "Membership Distribution",
                theme: "fusion",
              },
              data: [
                { label: "Basic", value: membershipDistribution.basic },
                { label: "Standard", value: membershipDistribution.standard },
                { label: "Premium", value: membershipDistribution.premium },
                { label: "Annual", value: membershipDistribution.annual },
              ],
            },
          },
          newMembers: {
            type: "column2d",
            width: "100%",
            height: "400",
            dataFormat: "json",
            dataSource: {
              chart: {
                caption: "New Members This Month",
                theme: "fusion",
              },
              data: [{ label: "New Members", value: newMembersThisMonth }],
            },
          },

          
          monthlyPaymentTrends: {
            type: "line",
            width: "100%",
            height: "400",
            dataFormat: "json",
            dataSource: {
              chart: {
                caption: "Monthly Payment Trends",
                xAxisName: "Month",
                yAxisName: "Total Payments (USD)",
                theme: "fusion",
              },
              // data: [
              //   { label: "Jan", value: 0 },
              //   { label: "Feb", value: 0 },
              //   { label: "Mar", value: 1779 },
              //   { label: "Apr", value: 0 },
              //   { label: "May", value: 0 },
              //   { label: "Jun", value: 1536 },
              //   { label: "Jul", value: 1944 },
              //   { label: "Aug", value: 0 },
              //   { label: "Sep", value: 0 },
              //   { label: "Oct", value: 0 },
              //   { label: "Nov", value: 0 },
              //   { label: "Dec", value: 0 },
              // ],
              
            },
          },
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const calculateMonthlyTrends = async() => {
      try {
        const token = localStorage.getItem("token"); // Retrieve token from local storage
        const response = await axios.get(
          "http://localhost:3000/api/library/get-all-members",
          {
            headers: {
              Authorization: `Bearer ${token}`, // Add token to headers
            },
          }
        );
        console.log("res",response)
        const monthlyPayments = response.data.reduce((acc, member) => {
          member.paymentHistory.forEach((payment) => {
            const paymentDate = new Date(payment.paymentDate);
            if (!isNaN(paymentDate.getTime())) {
              const year = paymentDate.getFullYear();
              const month = paymentDate.getMonth();
              const key = `${year}-${month}`;
              if (!acc[key]) acc[key] = 0;
              acc[key] += payment.amount;
            }
          });
          return acc;
        }, {});
        console.log("month",monthlyPayments)
    
        const monthlyData = Array.from({ length: 12 }, (_, month) => {
          const key = `${selectedYear}-${month}`;
          return {
            label: new Date(selectedYear, month, 1).toLocaleString("default", {
              month: "short",
            }),
            value: monthlyPayments[key] || 0,
          };
        });
        console.log(monthlyData)
    
        setChartConfigs((prevConfigs) => ({
          ...prevConfigs,
          monthlyPaymentTrends: {
            type: "line",
            width: "100%",
            height: "400",
            dataFormat: "json",
            dataSource: {
              chart: {
                caption: "Monthly Payment Trends",
                xAxisName: "Month",
                yAxisName: "Total Payments",
                theme: "fusion",
              },
              data: monthlyData,
            },
          },
        }));
      }
      catch (error) {
          console.error("Error fetching data:", error);
      }

      
      
    };
  
    calculateMonthlyTrends();
  }, [ selectedYear]);
  



  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Analytics Dashboard
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="text-xl font-semibold">Total Members</h3>
          <p className="text-2xl font-bold">{analyticsData.totalMembers}</p>
          <ReactFusioncharts {...chartConfigs.totalMembers} />
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="text-xl font-semibold">Total Revenue</h3>
          <p className="text-2xl font-bold">{analyticsData.totalRevenue}</p>
          <ReactFusioncharts {...chartConfigs.revenue} />
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="text-xl font-semibold">Membership Distribution</h3>
          <ReactFusioncharts {...chartConfigs.membershipDistribution} />
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="text-xl font-semibold">New Members This Month</h3>
          <p className="text-2xl font-bold">
            {analyticsData.newMembersThisMonth}
          </p>
          <ReactFusioncharts {...chartConfigs.newMembers} />
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6 col-span-full">
          <h3 className="text-xl font-semibold">Monthly Payment Trends</h3>
          <div className="mb-4">
            <label htmlFor="yearFilter" className="mr-2 font-medium">
              Select Year:
            </label>
            <select
              id="yearFilter"
              className="border rounded px-2 py-1 w-40"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <ReactFusioncharts {...chartConfigs.monthlyPaymentTrends} />
        </div>
      </div>
    </div>
  );
};

export default Analytics;
