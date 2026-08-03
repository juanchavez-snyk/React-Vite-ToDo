package io.snyk.demo.reporting;

import java.util.HashMap;
import java.util.Map;

// javax.* imports. Spring Framework 6 moved the entire servlet stack to
// jakarta.*, so every one of these lines has to change as part of the security
// upgrade — on top of the JDK 11 -> 17 move the new baseline forces.
//
// This is the concrete form of the "LTS drop" Breakability scenario: the
// vulnerable version compiles on Java 11 today, and the fixed version does not.
import javax.servlet.http.HttpServletRequest;

import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * Serves a small completion-rate report over the todo list.
 */
@Controller
public class ReportController {

    @GetMapping("/api/reports/summary")
    @ResponseBody
    public Map<String, Object> summary(HttpServletRequest request,
                                       @RequestParam(required = false) String range) {

        Map<String, Object> report = new HashMap<>();
        report.put("range", range == null ? "7d" : range);
        report.put("userAgent", request.getHeader("User-Agent"));

        // HttpMethod is an enum in Spring 5 and a class in Spring 6, so this
        // switch is another compile break on upgrade.
        HttpMethod method = HttpMethod.resolve(request.getMethod());
        switch (method) {
            case GET:
                report.put("cacheable", true);
                break;
            default:
                report.put("cacheable", false);
                break;
        }

        return report;
    }
}
